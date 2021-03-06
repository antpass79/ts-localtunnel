const SERVICE_IDENTIFIER = {
    KOA: Symbol.for("Koa"),
    ROUTER: Symbol.for("Router"),
    LOG_SERVICE: Symbol.for("LogService"),
    SERVER_OPTIONS_BUILDER: Symbol.for("ServerOptionsBuilder"),
    SERVER_OPTIONS_RESOLVER: Symbol.for("ServerOptionsResolver"),
    CLIENT: Symbol.for("Client"),
    CLIENT_MANAGER: Symbol.for("ClientManager"),
    TUNNEL_AGENT: Symbol.for("TunnelAgent"),
    TUNNEL_SERVER: Symbol.for("TunnelServer"),
    SECURE_TUNNEL_SERVER: Symbol.for("SecureTunnelServer"),
    TUNNEL_AGENT_BUILDER: Symbol.for("TunnelAgentBuilder"),
    CLIENT_BUILDER: Symbol.for("ClientBuilder"),
    FREE_PORT_SERVICE: Symbol.for("FreePortService")
};

export default SERVICE_IDENTIFIER;