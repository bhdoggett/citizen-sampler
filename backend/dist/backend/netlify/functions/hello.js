"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const handler = async () => {
    const data = {
        startTime: 0,
        duration: 0,
        note: "C4",
        velocity: 1,
    };
    return {
        statusCode: 200,
        body: JSON.stringify(data),
    };
};
exports.handler = handler;
