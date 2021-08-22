const http = require('http');
const net = require('net');
const zlib = require('zlib');

const port = 8233;
const hostname = '0.0.0.0';

const proxyServer = http.createServer((clientReq, clientRes) => {
  console.log(`request url: ${clientReq.url}`);

  const proxyReq = http.request(
    clientReq.url,
    {
      method: clientReq.method,
      headers: clientReq.headers,
    },
    (proxyRes) => {
      clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);

      proxyRes.pipe(clientRes);

      let output;
      if (proxyRes.headers['content-encoding'] === 'gzip') {
        const gzip = zlib.createGunzip();
        proxyRes.pipe(gzip);
        output = gzip;
      } else {
        output = proxyRes;
      }

      const body = [];
      output
        .on('data', (chunk) => {
          body.push(chunk);
        })
        .on('end', () => {
          const stringifyBody = Buffer.concat(body).toString();
          console.log('response: ', {
            statusCode: proxyRes.statusCode,
            headers: proxyRes.headers,
            body: stringifyBody,
          });
        });
    }
  );

  proxyReq.on('error', (e) => {
    clientRes.end();
  });

  clientReq.pipe(proxyReq);
});

proxyServer.on('connect', (clientReq, clientSocket, head) => {
  console.log(`connect to: ${clientReq.url}`);

  const url = new URL(`http://${clientReq.url}`);

  const proxySocket = net.connect(url.port || 80, url.hostname, () => {
    clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
  });
  // const body = [];
  proxySocket
    // .on('data', (data) => {
    //   body.push(data);
    // })
    // .on('end', () => {
    //   const stringifyBody = Buffer.concat(body).toString();
    //   console.log({ body: stringifyBody });
    //   body.length = 0;
    // })
    .on('close', () => {
      console.log(`tunnel to ${clientReq.url} end`);
    })
    .on('error', (e) => {
      console.error(e);
      clientSocket.end();
    });
  proxySocket.write(head);
  proxySocket.pipe(clientSocket);
  clientSocket.pipe(proxySocket);
});

proxyServer.on('listening', () => {
  console.log(`proxy server listening at http://${hostname}:${port}`);
});

proxyServer.listen(port, hostname);
