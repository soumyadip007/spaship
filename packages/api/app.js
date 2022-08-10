const express = require("express");
const expressSanitizer = require("express-sanitizer");
const bodyParser = require("body-parser");
const compression = require("compression");
const cors = require("cors");
const helmet = require("helmet");
const swaggerUi = require("swagger-ui-express");
const path = require("path");
const fs = require("fs");
const yaml = require("js-yaml");
const { pinoExpress } = require("@spaship/common/lib/logging/pino");
const authentication = require("./middlewares/authentication");
const responseWrapper = require("./middlewares/responseWrapper");
const errorHandler = require("./middlewares/errorHandler");
const { liveness, readiness } = require("./health");
const config = require("./config");
const routes = require("./routes");
const swaggerDocument = yaml.safeLoad(fs.readFileSync(path.join(__dirname, "openapi.yml"), "utf8"));
const app = new express();
const rateLimit = require("express-rate-limit");

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minutes
  max: 10, // Limit each IP to 10 requests per `window` (here, per 1 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

app
  .use(bodyParser.json({ limit: "50mb" }))
  .use(bodyParser.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 }))
  .use(expressSanitizer())
  .use(cors())
  .use(helmet())
  .use(compression())
  .use(pinoExpress)
  .use(responseWrapper())
  .get("/liveness", liveness)
  .get("/readiness", readiness)
  .use("/spas", express.static(path.join(__dirname, config.get("directoryBasePath"))))
  .use(
    "/api-docs",
    (req, res, next) => {
      swaggerDocument.servers[0].url = `${req.get("host")}/api/v1`;
      req.swaggerDoc = swaggerDocument;
      next();
    },
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument)
  )
  .use("/api/v1/applications/deploy", [authentication(), apiLimiter], routes)
  .use("/api", [authentication()], routes)
  .use(errorHandler());

module.exports = app;
