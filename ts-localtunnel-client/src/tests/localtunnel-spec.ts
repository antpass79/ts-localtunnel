/* eslint-disable no-console */

import crypto from 'crypto';
import http from 'http';
import https from 'https';
import url from 'url';
import assert from 'assert';
import { AddressInfo } from 'net';

const localtunnel = require('./localtunnel');

let fakePort: any;

before(done => {
  const server = http.createServer();
  server.on('request', (req, res) => {
    res.write(req.headers.host);
    res.end();
  });
  server.listen(() => {
    const { port } = (server.address() as AddressInfo);
    fakePort = port;
    done();
  });
});

test('query localtunnel server w/ ident', async done => {
  const tunnel = await localtunnel({ port: fakePort });
  assert.ok(new RegExp('^https://.*localtunnel.me$').test(tunnel.url));

  const parsed = url.parse(tunnel.url);
  const opt: any = {
    host: parsed.host,
    port: 443,
    headers: { host: parsed.hostname },
    path: '/',
  };

  const req = https.request(opt, res => {
    res.setEncoding('utf8');
    let body = '';

    res.on('data', chunk => {
      body += chunk;
    });

    res.on('end', () => {
      assert(/.*[.]localtunnel[.]me/.test(body), body);
      tunnel.close();
      done();
    });
  });

  req.end();
});

test('request specific domain', async () => {
  const subdomain = Math.random()
    .toString(36)
    .substr(2);
  const tunnel = await localtunnel({ port: fakePort, subdomain });
  assert.ok(new RegExp(`^https://${subdomain}.localtunnel.me$`).test(tunnel.url));
  tunnel.close();
});

describe('--local-host localhost', () => {
  test('override Host header with local-host', async done => {
    const tunnel = await localtunnel({ port: fakePort, local_host: 'localhost' });
    assert.ok(new RegExp('^https://.*localtunnel.me$').test(tunnel.url));

    const parsed = url.parse(tunnel.url);
    const opt: any = {
      host: parsed.host,
      port: 443,
      headers: { host: parsed.hostname },
      path: '/',
    };

    const req = https.request(opt, res => {
      res.setEncoding('utf8');
      let body = '';

      res.on('data', chunk => {
        body += chunk;
      });

      res.on('end', () => {
        assert.equal(body, 'localhost');
        tunnel.close();
        done();
      });
    });

    req.end();
  });
});

describe('--local-host 127.0.0.1', () => {
  test('override Host header with local-host', async done => {
    const tunnel = await localtunnel({ port: fakePort, local_host: '127.0.0.1' });
    assert.ok(new RegExp('^https://.*localtunnel.me$').test(tunnel.url));

    const parsed = url.parse(tunnel.url);
    const opt: any = {
      host: parsed.host,
      port: 443,
      headers: {
        host: parsed.hostname,
      },
      path: '/',
    };

    const req = https.request(opt, res => {
      res.setEncoding('utf8');
      let body = '';

      res.on('data', chunk => {
        body += chunk;
      });

      res.on('end', () => {
        assert.equal(body, '127.0.0.1');
        tunnel.close();
        done();
      });
    });

    req.end();
  });

  test('send chunked request', async done => {
    const tunnel = await localtunnel({ port: fakePort, local_host: '127.0.0.1' });
    assert.ok(new RegExp('^https://.*localtunnel.me$').test(tunnel.url));

    const parsed = url.parse(tunnel.url);
    const opt: any = {
      host: parsed.host,
      port: 443,
      headers: {
        host: parsed.hostname,
        'Transfer-Encoding': 'chunked',
      },
      path: '/',
    };

    const req = https.request(opt, res => {
      res.setEncoding('utf8');
      let body = '';

      res.on('data', chunk => {
        body += chunk;
      });

      res.on('end', () => {
        assert.strictEqual(body, '127.0.0.1');
        tunnel.close();
        done();
      });
    });

    req.end(crypto.randomBytes(1024 * 8).toString('base64'));
  });
});