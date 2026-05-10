#!/usr/bin/env node

/**
 * y-websocket collaboration server for the playground.
 *
 * This is the standard Yjs collaboration server pattern:
 *   • Each "room" (document) gets its own Y.Doc on the server.
 *   • Clients connect via WebSocket, send sync/awareness messages
 *     using the y-protocols wire format.
 *   • The server relays doc updates and awareness to all peers in
 *     the same room.
 *
 * Crucially, this script imports from the SAME `yjs` and `y-protocols`
 * versions the client uses (v13 / v1), avoiding the encoding mismatch
 * that @y/websocket-server (which depends on Yjs v14 RC) causes.
 *
 * In production, replace this with Hocuspocus, y-redis, or any
 * y-websocket-compatible backend that adds auth, persistence, and
 * horizontal scaling.
 */

const http = require("http");
const WebSocket = require("ws");
const Y = require("yjs");
const syncProtocol = require("y-protocols/sync");
const awarenessProtocol = require("y-protocols/awareness");
const encoding = require("lib0/encoding");
const decoding = require("lib0/decoding");
const map = require("lib0/map");

const HOST = process.env.HOST || "localhost";
const PORT = parseInt(process.env.PORT || "1234", 10);

// Message types matching y-websocket client
const MSG_SYNC = 0;
const MSG_AWARENESS = 1;

/** @type {Map<string, { doc: Y.Doc, awareness: awarenessProtocol.Awareness, conns: Map<WebSocket, Set<number>> }>} */
const rooms = new Map();

function getRoom(roomName) {
  return map.setIfUndefined(rooms, roomName, () => {
    const doc = new Y.Doc();
    const awareness = new awarenessProtocol.Awareness(doc);

    // Clean up awareness when a client disconnects
    awareness.setLocalState(null);

    const room = { doc, awareness, conns: new Map() };

    // Broadcast doc updates to all connected clients
    doc.on("update", (update, origin) => {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MSG_SYNC);
      syncProtocol.writeUpdate(encoder, update);
      const message = encoding.toUint8Array(encoder);
      room.conns.forEach((_, conn) => {
        if (conn !== origin && conn.readyState === WebSocket.OPEN) {
          conn.send(message);
        }
      });
    });

    // Broadcast awareness updates
    awareness.on("update", ({ added, updated, removed }, origin) => {
      const changedClients = added.concat(updated, removed);
      if (changedClients.length === 0) return;
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MSG_AWARENESS);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients),
      );
      const message = encoding.toUint8Array(encoder);
      room.conns.forEach((_, conn) => {
        if (conn !== origin && conn.readyState === WebSocket.OPEN) {
          conn.send(message);
        }
      });
    });

    return room;
  });
}

function handleConnection(conn, req) {
  // Room name = last segment of the URL path
  const roomName = req.url?.slice(1).split("?")[0] || "default";
  const room = getRoom(roomName);
  const { doc, awareness } = room;

  room.conns.set(conn, new Set());

  conn.on("message", (data) => {
    try {
      const message =
        data instanceof Buffer ? new Uint8Array(data) : new Uint8Array(data);
      const decoder = decoding.createDecoder(message);
      const msgType = decoding.readVarUint(decoder);

      switch (msgType) {
        case MSG_SYNC: {
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, MSG_SYNC);
          syncProtocol.readSyncMessage(decoder, encoder, doc, conn);
          const reply = encoding.toUint8Array(encoder);
          // Only send if there's actual content (not just the msgType header)
          if (encoding.length(encoder) > 1) {
            conn.send(reply);
          }
          break;
        }
        case MSG_AWARENESS: {
          awarenessProtocol.applyAwarenessUpdate(
            awareness,
            decoding.readVarUint8Array(decoder),
            conn,
          );
          break;
        }
      }
    } catch (err) {
      console.error("Error handling message:", err);
    }
  });

  conn.on("close", () => {
    const controlledIds = room.conns.get(conn);
    room.conns.delete(conn);

    // Remove awareness states for this connection
    if (controlledIds) {
      awarenessProtocol.removeAwarenessStates(
        awareness,
        Array.from(controlledIds),
        null,
      );
    }

    // Clean up empty rooms
    if (room.conns.size === 0) {
      awareness.destroy();
      doc.destroy();
      rooms.delete(roomName);
    }
  });

  // Send initial sync step 1
  {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MSG_SYNC);
    syncProtocol.writeSyncStep1(encoder, doc);
    conn.send(encoding.toUint8Array(encoder));
  }

  // Send current awareness state
  const awarenessStates = awareness.getStates();
  if (awarenessStates.size > 0) {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MSG_AWARENESS);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(
        awareness,
        Array.from(awarenessStates.keys()),
      ),
    );
    conn.send(encoding.toUint8Array(encoder));
  }
}

// ── HTTP + WebSocket server ───────────────────────────────────────────
const server = http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("y-websocket collaboration server");
});

const wss = new WebSocket.Server({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req);
  });
});

wss.on("connection", handleConnection);

server.listen(PORT, HOST, () => {
  console.log(`[collab] y-websocket server running at ws://${HOST}:${PORT}`);
});
