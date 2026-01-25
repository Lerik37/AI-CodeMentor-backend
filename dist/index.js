"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use((0, cors_1.default)({
    origin: 'http://localhost:5174',
}));
app.use(express_1.default.json());
const languageIds = {
    javascript: 63,
    python: 71,
    typescript: 74,
    csharp: 51,
};
app.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT}`);
});
