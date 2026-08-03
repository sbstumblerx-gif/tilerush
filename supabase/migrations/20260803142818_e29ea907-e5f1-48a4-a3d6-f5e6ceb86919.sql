REVOKE ALL ON FUNCTION public.matchmaking_join() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.matchmaking_poll() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.matchmaking_leave() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.matchmaking_join() TO authenticated;
GRANT EXECUTE ON FUNCTION public.matchmaking_poll() TO authenticated;
GRANT EXECUTE ON FUNCTION public.matchmaking_leave() TO authenticated;