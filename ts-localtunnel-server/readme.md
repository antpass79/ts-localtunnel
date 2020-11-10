## How to run

Run an Angular App in order to avoid *Invalid Header Error*: 
    
    ng serve --disable-host-check

How to run ts-tunnelserver for orverriding default configuration:

    npm run start -- -p 81

npm run start -- -p 8000 -a tunnelserver.westeurope.cloudapp.azure.com -d localhost 10.0.0.4 tunnelserver tunnelserver.westeurope.cloudapp.azure.com 40.68.217.234 tunnelserver.com

npm run start -- -p 9000 -a tunnelserver.westeurope.cloudapp.azure.com -d localhost 10.0.0.4 tunnelserver tunnelserver.westeurope.cloudapp.azure.com 40.68.217.234 tunnelserver.com

## References

- <https://www.cloudinsidr.com/content/how-to-install-the-most-recent-version-of-openssl-on-windows-10-in-64-bit/>
- <https://nodejs.org/en/knowledge/HTTP/servers/how-to-create-a-HTTPS-server/>
- <https://daveabrock.com/2017/02/04/publish-your-localhost-with-the-world-using-localtunnel>