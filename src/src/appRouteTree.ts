/* eslint-disable */
// @ts-nocheck
import { Route as rootRouteImport } from './routes/__root';
import { Route as TasksRouteImport } from './routes/tasks';
import { Route as StatsRouteImport } from './routes/stats';
import { Route as ShopRouteImport } from './routes/shop';
import { Route as SettingsRouteImport } from './routes/settings';
import { Route as ProfileRouteImport } from './routes/profile';
import { Route as PassRouteImport } from './routes/pass';
import { Route as MultiplayerRouteImport } from './routes/multiplayer';
import { Route as LevelsRouteImport } from './routes/levels';
import { Route as FriendsRouteImport } from './routes/friends';
import { Route as EventsRouteImport } from './routes/events';
import { Route as CustomizeRouteImport } from './routes/customize';
import { Route as IndexRouteImport } from './routes/index';
import { Route as PartyCodeRouteImport } from './routes/party.$code';

const TasksRoute = TasksRouteImport.update({ id: '/tasks', path: '/tasks', getParentRoute: () => rootRouteImport } as any);
const StatsRoute = StatsRouteImport.update({ id: '/stats', path: '/stats', getParentRoute: () => rootRouteImport } as any);
const ShopRoute = ShopRouteImport.update({ id: '/shop', path: '/shop', getParentRoute: () => rootRouteImport } as any);
const SettingsRoute = SettingsRouteImport.update({ id: '/settings', path: '/settings', getParentRoute: () => rootRouteImport } as any);
const ProfileRoute = ProfileRouteImport.update({ id: '/profile', path: '/profile', getParentRoute: () => rootRouteImport } as any);
const PassRoute = PassRouteImport.update({ id: '/pass', path: '/pass', getParentRoute: () => rootRouteImport } as any);
const MultiplayerRoute = MultiplayerRouteImport.update({ id: '/multiplayer', path: '/multiplayer', getParentRoute: () => rootRouteImport } as any);
const LevelsRoute = LevelsRouteImport.update({ id: '/levels', path: '/levels', getParentRoute: () => rootRouteImport } as any);
const FriendsRoute = FriendsRouteImport.update({ id: '/friends', path: '/friends', getParentRoute: () => rootRouteImport } as any);
const EventsRoute = EventsRouteImport.update({ id: '/events', path: '/events', getParentRoute: () => rootRouteImport } as any);
const CustomizeRoute = CustomizeRouteImport.update({ id: '/customize', path: '/customize', getParentRoute: () => rootRouteImport } as any);
const IndexRoute = IndexRouteImport.update({ id: '/', path: '/', getParentRoute: () => rootRouteImport } as any);
const PartyCodeRoute = PartyCodeRouteImport.update({ id: '/party/$code', path: '/party/$code', getParentRoute: () => rootRouteImport } as any);

const rootRouteChildren = {
  IndexRoute, CustomizeRoute, EventsRoute, FriendsRoute, LevelsRoute, MultiplayerRoute, PassRoute, ProfileRoute, SettingsRoute, ShopRoute, StatsRoute, TasksRoute, PartyCodeRoute
};

export const routeTree = rootRouteImport._addFileChildren(rootRouteChildren);
