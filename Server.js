import express from "express";
import fetch from "node-fetch";
import handlebars from "express-handlebars";
import { promises } from 'fs';
import { Server as HttpServer } from "http";
import { Server as IOServer } from "socket.io";
import prodRoutes from "./routes/ProductRoutes.js";
import frontRoutes from "./routes/FrontRoutes.js";

const PORT = 8080;
const app = express();

const httpServer = new HttpServer(app);
const io = new IOServer(httpServer);

app.use(express.static("public"));

const mensajes = [];
const mensajesLogFile = 'public/mensajes.log';

// Funcion que carga los productos y emite el llamado a "listProducts"
function getProducts() {
	fetch("http://localhost:8080/api/productos")
	.then((res) => res.json())
	.then(function (data) {
		io.sockets.emit("listProducts", data);
	});
};

// Funcion que devuelve el listado de mensajes
function getMensajes() {
	io.sockets.emit("listMensajes", mensajes);
};

async function guardarMensajes(mensajes) {
	try {
		await promises.writeFile(mensajesLogFile, JSON.stringify(mensajes, null, "\t"));
	} catch(err) {
		console.log(err);
	}
}

io.on("connection", (socket) => {
	console.log("Nuevo cliente conectado!");
	getProducts();
	getMensajes();

	/* Escucho los mensajes enviado por el cliente y se los propago a todos */
	socket.on("postProduct", () => {
		getProducts();
	}).on("postMensaje", data => {
		mensajes.push(data);
		guardarMensajes(mensajes);
		getMensajes();
	}).on('disconnect', () => {
		console.log('Usuario desconectado')
	});
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/", frontRoutes);
app.use("/api/productos", prodRoutes);

app.engine("hbs", handlebars({
    extname: "hbs",
    defaultLayout: "layout.hbs"
  })
);

app.set("views", "./views");
app.set("view engine", "hbs");

// Conexion a server con callback avisando de conexion exitosa
httpServer.listen(PORT, () => { console.log(`Ya me conecte al puerto ${PORT}.`); })
.on("error", (error) => console.log("Hubo un error inicializando el servidor.") );
