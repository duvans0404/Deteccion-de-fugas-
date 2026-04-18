const { Device, House } = require("../models");
const { getUserHouseScope, isOperator } = require("../middlewares/authorize");

const createDevice = async (req, res, next) => {
  try {
    if (!isOperator(req.user)) {
      return res.status(403).json({ ok: false, msg: "No tienes permisos para crear dispositivos" });
    }

    const payload = {
      name: String(req.body.name || "").trim(),
      location: String(req.body.location || "").trim(),
      status: req.body.status ? String(req.body.status).trim().toUpperCase() : "ACTIVO",
      house_id: req.body.houseId ? Number(req.body.houseId) : null
    };

    const scopedHouseId = getUserHouseScope(req.user);
    if (scopedHouseId) {
      payload.house_id = scopedHouseId;
    }

    if (payload.house_id) {
      const house = await House.findByPk(payload.house_id);
      if (!house) {
        return res.status(404).json({ ok: false, msg: "Casa no encontrada" });
      }
    }

    const exists = await Device.findOne({ where: { name: payload.name } });
    if (exists) {
      return res.status(409).json({ ok: false, msg: "El nombre del dispositivo ya existe" });
    }

    const device = await Device.create(payload);
    const created = await Device.findByPk(device.id, {
      include: [{ model: House, attributes: ["id", "name", "code", "status"], required: false }]
    });

    return res.status(201).json({ ok: true, device: created });
  } catch (error) {
    return next(error);
  }
};

const updateDevice = async (req, res, next) => {
  try {
    if (!isOperator(req.user)) {
      return res.status(403).json({ ok: false, msg: "No tienes permisos para editar dispositivos" });
    }

    const device = await Device.findByPk(req.params.id);
    if (!device) {
      return res.status(404).json({ ok: false, msg: "Dispositivo no encontrado" });
    }

    const scopedHouseId = getUserHouseScope(req.user);
    if (scopedHouseId && device.house_id !== scopedHouseId) {
      return res.status(403).json({ ok: false, msg: "No tienes acceso a este dispositivo" });
    }

    const nextHouseId = scopedHouseId || Number(req.body.houseId);
    const house = await House.findByPk(nextHouseId);
    if (!house) {
      return res.status(404).json({ ok: false, msg: "Casa no encontrada" });
    }

    const nextName = String(req.body.name || "").trim();
    if (nextName !== device.name) {
      const duplicate = await Device.findOne({ where: { name: nextName } });
      if (duplicate) {
        return res.status(409).json({ ok: false, msg: "El nombre del dispositivo ya existe" });
      }
    }

    await device.update({
      name: nextName,
      location: String(req.body.location || "").trim(),
      status: String(req.body.status || "").trim().toUpperCase(),
      house_id: house.id
    });

    const updated = await Device.findByPk(device.id, {
      include: [{ model: House, attributes: ["id", "name", "code", "status"], required: false }]
    });
    return res.json({ ok: true, device: updated });
  } catch (error) {
    return next(error);
  }
};

const deleteDevice = async (req, res, next) => {
  try {
    if (!isOperator(req.user)) {
      return res.status(403).json({ ok: false, msg: "No tienes permisos para eliminar dispositivos" });
    }

    const device = await Device.findByPk(req.params.id);
    if (!device) {
      return res.status(404).json({ ok: false, msg: "Dispositivo no encontrado" });
    }

    const scopedHouseId = getUserHouseScope(req.user);
    if (scopedHouseId && device.house_id !== scopedHouseId) {
      return res.status(403).json({ ok: false, msg: "No tienes acceso a este dispositivo" });
    }

    await device.destroy();
    return res.json({ ok: true, msg: "Dispositivo eliminado" });
  } catch (error) {
    return next(error);
  }
};

const listDevices = async (req, res, next) => {
  try {
    const where = {};
    const scopedHouseId = getUserHouseScope(req.user);
    if (scopedHouseId) {
      where.house_id = scopedHouseId;
    } else if (req.query.houseId) {
      where.house_id = Number(req.query.houseId);
    }

    const devices = await Device.findAll({
      where,
      include: [{ model: House, attributes: ["id", "name", "code", "status"], required: false }],
      order: [["id", "ASC"]]
    });
    return res.json({ ok: true, devices });
  } catch (error) {
    return next(error);
  }
};

module.exports = { createDevice, updateDevice, deleteDevice, listDevices };
