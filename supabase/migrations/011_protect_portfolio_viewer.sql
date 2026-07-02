-- Video/VR links are only served via portfolio-viewer edge function (session token required).

revoke execute on function public.get_portfolio_viewer(text) from anon, authenticated;
