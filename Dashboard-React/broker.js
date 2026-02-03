import Aedes from 'aedes';
import { createServer } from 'net';
import { createServer as createHttpServer } from 'http';
import ws from 'websocket-stream';
import os from 'os'; // Módulo para ler o IP do PC

const PORT_TCP = 1883; // Porta para o Pico W
const PORT_WS = 8888;  // Porta para o React

const aedes = new Aedes();
const server = createServer(aedes.handle);
const httpServer = createHttpServer();

// --- Função para descobrir o IP da máquina ---
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Pega apenas IPv4 e ignora o 'localhost' (127.0.0.1)
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const myIP = getLocalIP();

// Inicia o servidor TCP
server.listen(PORT_TCP, function () {
  console.log('---------------------------------------------------');
  console.log(`✅ Broker MQTT (TCP) rodando!`);
  console.log(`📡 Para o Pico W, use: IP [${myIP}] e Porta [${PORT_TCP}]`);
  console.log('---------------------------------------------------');
});

// Inicia o servidor WebSocket
ws.createServer({ server: httpServer }, aedes.handle);

httpServer.listen(PORT_WS, function () {
  console.log(`✅ Broker MQTT (WS) para React rodando na porta: ${PORT_WS}`);
  console.log('---------------------------------------------------');
});

// --- Logs de Debug ---

aedes.on('client', function (client) {
  console.log(`🔌 Cliente conectado: ${client ? client.id : client}`);
});

aedes.on('publish', function (packet, client) {
  if (packet && packet.topic.startsWith('tinyml-cnn/')) {
      console.log(`📢 [${packet.topic}]: ${packet.payload.toString()}`);
  }
});