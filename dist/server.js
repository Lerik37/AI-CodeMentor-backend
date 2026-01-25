"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const port = Number(process.env.PORT ?? 3000);
const application = (0, app_1.createApp)();
application.listen(port, () => {
    console.log(`Backend listening on http://localhost:${port}`);
});
