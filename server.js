const { log, info, warn, error } = require("console");
const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
  allowEIO3: true,
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    transports: ["websocket", "polling"],
    credentials: true,
  },
});

const fs = require("fs");

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.get("/chartData", (req, res) => {
  fs.readFile("data.json", "utf8", (err, jsonString) => {
    if (err) {
      error("File read failed:", err);
      return res.json({data: [], msg: "error"});
    }
    let dataJson = JSON.parse(jsonString);
    res.json({data: dataJson.data, msg: "success"});
  });
});

io.on("connection", (socket) => {
  info(
    "[" + socket.id + "] new connection",
    socket.request.connection.remoteAddress
  );

  socket.on("/esp/envir", (data) => {
    log(`message from ${data.clientID} via socket id: ${socket.id}`);
    socket.broadcast.emit("/web/envir", data);
  });

  
  socket.on("/esp/sleep", (data) => {
    log(data)
    //add new data into data.json
    //the data.json file look like: 
    /**
     * {
     *  data:[{...},{...},{...}]
     * }
     */
    
    fs.readFile("data.json", "utf8", (err, jsonString) => {
      if (err) {
        error("File read failed:", err);
        return;
      }
      let dataJson = JSON.parse(jsonString);
      dataJson.data.push(data.msg);
      fs.writeFile("data.json", JSON.stringify(dataJson), (err) => {
        if (err) {
          error("Error writing file", err);
        } else {
          log("Successfully wrote file");
        }
      });
    });
    socket.broadcast.emit("/web/sleep", 1);
  })
  /**************************** */
  //xu ly chung
  socket.on("reconnect", function () {
    warn("[" + socket.id + "] reconnect.");
  });
  socket.on("disconnect", () => {
    error("[" + socket.id + "] disconnect.");
  });
  socket.on("connect_error", (err) => {
    error(err.stack);
  });
});

//doi port khac di
server.listen(3000, () => {
  log("server is listening on port doi port di");
});

