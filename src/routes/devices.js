const express = require("express");
const { body, param, query } = require("express-validator");
const { createDevice, updateDevice, deleteDevice, listDevices } = require("../controllers/devicesController");
const auth = require("../middlewares/auth");
const validate = require("../middlewares/validate");

const router = express.Router();

router.post(
  "/",
  auth,
  [
    body("name").trim().isLength({ min: 3, max: 120 }).withMessage("name invalido"),
    body("location").trim().isLength({ min: 3 }).withMessage("location invalido"),
    body("status")
      .trim()
      .isIn(["ACTIVO", "NORMAL", "ALERTA", "FUGA", "ERROR", "INACTIVO", "MANTENIMIENTO"])
      .withMessage("status invalido"),
    body("houseId").isInt({ min: 1 }).withMessage("houseId invalido")
  ],
  validate,
  createDevice
);

router.put(
  "/:id",
  auth,
  [
    param("id").isInt({ min: 1 }).withMessage("id invalido"),
    body("name").trim().isLength({ min: 3, max: 120 }).withMessage("name invalido"),
    body("location").trim().isLength({ min: 3 }).withMessage("location invalido"),
    body("status")
      .trim()
      .isIn(["ACTIVO", "NORMAL", "ALERTA", "FUGA", "ERROR", "INACTIVO", "MANTENIMIENTO"])
      .withMessage("status invalido"),
    body("houseId").isInt({ min: 1 }).withMessage("houseId invalido")
  ],
  validate,
  updateDevice
);

router.delete(
  "/:id",
  auth,
  [param("id").isInt({ min: 1 }).withMessage("id invalido")],
  validate,
  deleteDevice
);

router.get(
  "/",
  auth,
  [query("houseId").optional().isInt({ min: 1 }).withMessage("houseId invalido")],
  validate,
  listDevices
);

module.exports = router;
