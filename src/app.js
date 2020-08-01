const express = require("express");
const axios = require("axios");
const querystring = require("querystring");
const app = express();
const fs = require("fs");
const config = fs.readFileSync("./config/config.json");
const AppleAuth = require("apple-auth");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");

let auth = new AppleAuth(
  config,
  fs.readFileSync("./config/AuthKey.p8").toString(),
  "text"
);

app.get("/token", (req, res) => {
  res.send(auth._tokenGenerator.generate());
});

app.post(
  "/auth",
  bodyParser.urlencoded({ extended: false }),
  async (req, res) => {
    const secret = await auth._tokenGenerator.generate();

    const requestBody = {
      grant_type: "authorization_code",
      code: req.body.code,
      redirect_uri: "https://apple-sign-in-stdiohue.herokuapp.com/auth",
      client_id: "com.LiveRun",
      client_secret: secret,
      scope: "name email",
    };
    console.log(requestBody);
    axios
      .request({
        method: "POST",
        url: "https://appleid.apple.com/auth/token",
        data: querystring.stringify(requestBody),
        headers: { "content-type": "application/x-www-form-urlencoded" },
      })
      .then((response) => {
        return res.json({
          success: true,
          data: response.data,
        });
      })
      .catch((error) => {
        return res.status(500).json({
          success: false,
          error: error.response.data,
        });
      });
  }
);

app.get("/refresh", async (req, res) => {
  try {
    console.log(Date().toString() + "GET /refresh");
    const accessToken = await auth.refreshToken(req.query.refreshToken);
    res.json(accessToken);
  } catch (ex) {
    console.error(ex);
    res.send("An error occurred!");
  }
});

app.set("port", process.env.PORT || 5000);

//For avoidong Heroku $PORT error
app
  .get("/", function (request, response) {
    var result = "App is running";
    response.send(result);
  })
  .listen(app.get("port"), function () {
    console.log(
      "App is running, server is listening on port ",
      app.get("port")
    );
  });
