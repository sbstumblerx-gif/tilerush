
REVOKE EXECUTE ON FUNCTION public.accept_friend_request(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.send_friend_request_by_code(TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tr_touch_updated_at() FROM PUBLIC, anon, authenticated;
