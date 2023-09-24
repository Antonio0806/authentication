const constants = require("./constants");
var apm = require('elastic-apm-node').start({
  serviceName: 'authentication-sorcerer',
  secretToken: constants.ELASTIC_APM_SECRET,
  serverUrl: constants.ELASTIC_ENDPOINT,
  environment: 'sorcerer',
  logLevel: 'debug'
})
const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
const cors = require("cors");
const app = express();
const logger = require("./logger");
const { createProxyMiddleware } = require("http-proxy-middleware");
apm.logger.info('Authenticaion microservice v1.0 starting');
// Mongoose
//if DEV environment(no docker):
mongoose
  .connect(`mongodb+srv://${constants.MONGO_USER}:${constants.MONGO_PASSWORD}@${constants.MONGO_SERVER}/?retryWrites=true&w=majority`, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  //mongoose.connect('mongodb://mongodb:27017/users', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => logger("Connected to database", "INFO"))
  .catch((err) => {logger("Database setup failed.", "ERROR");
   apm.captureError(err)});
app.use(morgan("dev"));
app.use(cors());
app.use(express.urlencoded({ extended: true })); // Middleware to handle URL-encoded bodies
app.use(express.json()); // Middleware to handle JSON bodies
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000"); // Update to match the domain you will make the request from
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});
//ssh proxy
const targetServerProxy = createProxyMiddleware({
  target: `http://localhost:2224/ssh/host/${constants.SSH_SERVER}?port=22`,
  changeOrigin: true,
});
          
const conditionMiddleware = (req, res, next) => {
  if (true) {
    return targetServerProxy(req, res, next);
  } else {
    return res.status(401).send("Access forbidden");
  }
};

app.use("/ssh", conditionMiddleware);

// Routes
app.use("/users", require("./routes/user"));
app.use("/api", require("./routes/api"));
const port = process.env.PORT || 3001;
app.listen(port, () => {
  logger(`Http server started on port ${port}`, 'INFO');
  apm.logger.info('http server started succesfully!');
});
