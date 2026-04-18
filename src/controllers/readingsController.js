const { Device, Reading, Alert, House } = require("../models");
const { broadcastDashboardUpdate } = require("../services/dashboardStream");
const { getUserHouseScope } = require("../middlewares/authorize");

const FUTURE_TOLERANCE_MS = 5_000;

const normalizeTimestamp = (rawTs) => {
  const now = new Date();
  if (!rawTs) return now;

  const parsed = new Date(rawTs);
  if (Number.isNaN(parsed.getTime())) {
    return now;
  }

  if (parsed.getTime() > now.getTime() + FUTURE_TOLERANCE_MS) {
    return now;
  }

  return parsed;
};

const ensureDevice = async ({ deviceId, deviceName, houseId }) => {
  let house = null;
  if (houseId) {
    house = await House.findByPk(houseId);
    if (!house) {
      const error = new Error("houseId no encontrado");
      error.status = 404;
      throw error;
    }
  }

  if (deviceId) {
    const device = await Device.findByPk(deviceId);
    if (!device) {
      const error = new Error("deviceId no encontrado");
      error.status = 404;
      throw error;
    }

    if (house && device.house_id && device.house_id !== house.id) {
      const error = new Error("El dispositivo no pertenece a la casa indicada");
      error.status = 409;
      throw error;
    }

    if (house && !device.house_id) {
      await device.update({ house_id: house.id });
    }

    return device;
  }

  const name = String(deviceName || "").trim();
  const [device] = await Device.findOrCreate({
    where: { name },
    defaults: {
      house_id: house?.id || null,
      name,
      status: "ACTIVO"
    }
  });

  if (house && !device.house_id) {
    await device.update({ house_id: house.id });
  }

  return device;
};

const createReading = async (req, res, next) => {
  try {
    const { houseId, deviceId, deviceName, ts, flow_lmin, pressure_kpa, risk, state } = req.body;
    const device = await ensureDevice({ houseId, deviceId, deviceName });
    const previousStatus = device.status || "NORMAL";
    const timestamp = normalizeTimestamp(ts);

    const reading = await Reading.create({
      device_id: device.id,
      ts: timestamp,
      flow_lmin,
      pressure_kpa,
      risk,
      state
    });

    await device.update({ status: state });

    if (state !== "NORMAL" && previousStatus !== state) {
      await Alert.create({
        device_id: device.id,
        ts: timestamp,
        severity: state,
        message: `Estado ${state} | Flujo ${flow_lmin} L/min | Presion ${pressure_kpa} kPa | Riesgo ${risk}%`,
        acknowledged: false
      });
    }

    broadcastDashboardUpdate().catch((error) => {
      console.error("No se pudo emitir la actualizacion del dashboard:", error);
    });

    return res.status(201).json({ ok: true, reading });
  } catch (error) {
    return next(error);
  }
};

const listReadings = async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit || 50), 200);
    const scopedHouseId = getUserHouseScope(req.user);
    const readings = await Reading.findAll({
      include: [
        {
          model: Device,
          attributes: ["id", "name", "house_id"],
          include: [{ model: House, attributes: ["id", "name", "code"], required: false }]
        }
      ],
      where: scopedHouseId ? { "$Device.house_id$": scopedHouseId } : undefined,
      order: [["ts", "DESC"]],
      limit
    });
    return res.json({ ok: true, readings });
  } catch (error) {
    return next(error);
  }
};

const latestReading = async (req, res, next) => {
  try {
    const scopedHouseId = getUserHouseScope(req.user);
    const reading = await Reading.findOne({
      include: [
        {
          model: Device,
          attributes: ["id", "name", "house_id"],
          include: [{ model: House, attributes: ["id", "name", "code"], required: false }]
        }
      ],
      where: scopedHouseId ? { "$Device.house_id$": scopedHouseId } : undefined,
      order: [["ts", "DESC"]]
    });
    return res.json({ ok: true, reading });
  } catch (error) {
    return next(error);
  }
};

module.exports = { createReading, listReadings, latestReading, normalizeTimestamp };
