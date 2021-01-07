import "reflect-metadata";
import Koa from 'koa';
import Router from 'koa-router';

import { helpers } from "inversify-vanillajs-helpers";

import { InjectableKoa } from '../services/injectable-koa';
import { InjectableRouter } from '../services/injectable-router';

import { Container } from "inversify";

import { ILogService } from "../interfaces/log-service";
import { IServerOptionsBuilder } from "../interfaces/server-options-builder";
import { IServerOptionsResolver } from "../interfaces/server-options-resolver";
import { IClientManager } from "../interfaces/client-manager";
import { ITunnelServer } from "../interfaces/tunnel-server";
import { ITunnelAgentBuilder } from "../interfaces/tunnel-agent-builder";
import { IClientBuilder } from "../interfaces/client-builder";

import { ConsoleLogService } from "../services/log-service";
import { InlineServerOptionsBuilder } from "../options/inline-server-options-builder";
import { ServerOptionsResolver } from "../options/server-options-resolver";
import { ClientManager } from "../services/client-manager";
import { TunnelServer } from "../services/tunnel-server";
import { TunnelAgentBuilder } from "../services/tunnel-agent-builder";
import { ClientBuilder } from "../services/client-builder";

import SERVICE_IDENTIFIER from "./identifiers";

let container = new Container( { skipBaseClassChecks: true } );

helpers.annotate(TunnelServer, [
    SERVICE_IDENTIFIER.KOA,
    SERVICE_IDENTIFIER.ROUTER,
    SERVICE_IDENTIFIER.LOG_SERVICE,
    SERVICE_IDENTIFIER.CLIENT_MANAGER,
    SERVICE_IDENTIFIER.SERVER_OPTIONS_RESOLVER
]);
helpers.annotate(ClientManager, [
    SERVICE_IDENTIFIER.LOG_SERVICE,
    SERVICE_IDENTIFIER.CLIENT_BUILDER,
    SERVICE_IDENTIFIER.SERVER_OPTIONS_RESOLVER
]);
helpers.annotate(InjectableKoa);
helpers.annotate(InjectableRouter);
helpers.annotate(InlineServerOptionsBuilder);
helpers.annotate(ServerOptionsResolver, [
    SERVICE_IDENTIFIER.SERVER_OPTIONS_BUILDER
]);
helpers.annotate(TunnelAgentBuilder);
helpers.annotate(ClientBuilder, [
    SERVICE_IDENTIFIER.TUNNEL_AGENT_BUILDER
]);

container.bind<Koa>(SERVICE_IDENTIFIER.KOA).to(InjectableKoa).inSingletonScope();
container.bind<Router>(SERVICE_IDENTIFIER.ROUTER).to(InjectableRouter).inSingletonScope();
container.bind<ILogService>(SERVICE_IDENTIFIER.LOG_SERVICE).to(ConsoleLogService).inSingletonScope();
container.bind<IServerOptionsBuilder>(SERVICE_IDENTIFIER.SERVER_OPTIONS_BUILDER).to(InlineServerOptionsBuilder).inSingletonScope();
container.bind<IServerOptionsResolver>(SERVICE_IDENTIFIER.SERVER_OPTIONS_RESOLVER).to(ServerOptionsResolver).inSingletonScope();
container.bind<IClientManager>(SERVICE_IDENTIFIER.CLIENT_MANAGER).to(ClientManager).inSingletonScope();
container.bind<ITunnelServer>(SERVICE_IDENTIFIER.TUNNEL_SERVER).to(TunnelServer).inSingletonScope();
container.bind<ITunnelAgentBuilder>(SERVICE_IDENTIFIER.TUNNEL_AGENT_BUILDER).to(TunnelAgentBuilder).inSingletonScope();
container.bind<IClientBuilder>(SERVICE_IDENTIFIER.CLIENT_BUILDER).to(ClientBuilder).inSingletonScope();

export default container;