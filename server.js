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
      return res.json({ data: [], msg: "error" });
    }
    let dataJson = JSON.parse(jsonString);
    res.json({ data: dataJson.data, msg: "success" });
  });
});


let count = {
  count1: 0,
  count2: 0,
  count3: 0,
  lastCount1: 0,
  lastCount2: 0,
  lastCount3: 0,
}

io.on("connection", (socket) => {
  info(
    "[" + socket.id + "] new connection",
    socket.request.connection.remoteAddress
  );

  socket.on("/esp/envir", (data) => {
    log(`message from ${data.clientID} via socket id: ${socket.id}`);
    socket.broadcast.emit("/web/envir", data);
  });

  socket.on("/esp/measure", (data) => {
    log(`message from ${data.clientID} via socket id: ${socket.id}`);
    if (count.lastCount1 != data.count1) {
      count.count1 += data.count1 - count.lastCount1;
    }
    if (count.lastCount2 != data.count2) {
      count.count2 += data.count2 - count.lastCount2;
    }
    if (count.lastCount3 != data.count3) {
      count.count3 += data.count3 - count.lastCount3;
    }
    data.count1 = count.count1;
    data.count2 = count.count2;
    data.count3 = count.count3;
    socket.broadcast.emit("/web/measure", data);
  });

  socket.on("/web/control", (data) => {
    log(`message from ${data.clientID} via socket id: ${socket.id}`);
    socket.broadcast.emit("/esp/control", data);
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

const PORT = process.env.PORT || 3000;
//doi port khac di
server.listen(PORT, () => {
  log("server is listening on : ", PORT);
});

