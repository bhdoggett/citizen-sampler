"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prod_1 = require("./prod");
const dev_1 = require("./dev");
const keys = process.env.NODE_ENV === "production" ? prod_1.prodKeys : dev_1.devKeys;
exports.default = keys;
