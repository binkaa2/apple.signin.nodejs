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

const getClientSecret = () => {
  // sign with RSA SHA256
  const privateKey = fs.readFileSync("./config/AuthKey.p8");
  const headers = {
    kid: config.key_id,
    typ: undefined, // is there another way to remove type?
  };
  const claims = {
    iss: config.team_id,
    aud: "https://appleid.apple.com",
    sub: config.client_id,
  };
  token = jwt.sign(claims, privateKey, {
    algorithm: "ES256",
    header: headers,
    expiresIn: "24h",
  });
  return token;
};

app.get("/", (req, res) => {
  console.log(Date().toString() + "GET /");
  console.log(getClientSecret());
  // res.redirect(auth.loginURL())
  res.redirect(auth.loginURL());
});

app.get("/token", (req, res) => {
  res.send(auth._tokenGenerator.generate());
});

app.post("/auth", bodyParser.urlencoded({ extended: false }), (req, res) => {
  const clientSecret = getClientSecret();
  const requestBody = {
    grant_type: "authorization_code",
    code: req.body.code,
    redirect_uri: config.redirect_uri,
    client_id: config.client_id,
    client_secret: clientSecret,
    scope: config.scope,
  };
  axios
    .request({
      method: "POST",
      url: "https://appleid.apple.com/auth/token",
      data: querystring.stringify(requestBody),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
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
});

app.post("/callback", bodyParser(), async (req, res) => {
  try {
    console.log(Date().toString() + "GET /auth");
    const response = await auth.accessToken(req.body.code);
    const idToken = jwt.decode(response.id_token);

    const user = {};
    user.id = idToken.sub;

    if (idToken.email) user.email = idToken.email;
    if (req.body.user) {
      const { name } = JSON.parse(req.body.user);
      user.name = name;
    }

    res.json(user);
  } catch (ex) {
    console.error(ex);
    res.send("An error occurred!");
  }
});

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
