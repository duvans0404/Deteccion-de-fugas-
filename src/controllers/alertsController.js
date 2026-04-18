const { Alert, Device, House } = require("../models");
const { broadcastDashboardUpdate } = require("../services/dashboardStream");
const { getUserHouseScope, isOperator } = require("../middlewares/authorize");

const listAlerts = async (req, res, next) => {
  try {
    const scopedHouseId = getUserHouseScope(req.user);
    const alerts = await Alert.findAll({
      include: [
        {
          model: Device,
          attributes: ["id", "name", "house_id"],
          include: [{ model: House, attributes: ["id", "name", "code"], required: false }]
        }
      ],
      where: scopedHouseId ? { "$Device.house_id$": scopedHouseId } : undefined,
      order: [["ts", "DESC"]],
      limit: 200
    });
    return res.json({ ok: true, alerts });
  } catch (error) {
    return next(error);
  }
};

const ackAlert = async (req, res, next) => {
  try {
    if (!isOperator(req.user)) {
      return res.status(403).json({ ok: false, msg: "No tienes permisos para confirmar alertas" });
    }

    const { id } = req.params;
    const alert = await Alert.findByPk(id, {
      include: [{ model: Device, attributes: ["id", "house_id"], required: false }]
    });
    if (!alert) {
      return res.status(404).json({ ok: false, msg: "Alerta no encontrada" });
    }
    const scopedHouseId = getUserHouseScope(req.user);
    if (scopedHouseId && alert.Device?.house_id !== scopedHouseId) {
      return res.status(403).json({ ok: false, msg: "No tienes acceso a esta alerta" });
    }
    alert.acknowledged = true;
    alert.ack_at = new Date();
    await alert.save();

    broadcastDashboardUpdate().catch((error) => {
      console.error("No se pudo emitir la actualizacion del dashboard:", error);
    });

    return res.json({ ok: true, alert });
  } catch (error) {
    return next(error);
  }
};

module.exports = { listAlerts, ackAlert };
