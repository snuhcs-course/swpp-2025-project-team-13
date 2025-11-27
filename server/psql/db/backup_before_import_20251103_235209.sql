--
-- PostgreSQL database dump
--

-- Dumped from database version 14.9 (Debian 14.9-1.pgdg110+1)
-- Dumped by pg_dump version 14.9 (Debian 14.9-1.pgdg110+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: auth_group; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.auth_group (id, name) FROM stdin;
\.


--
-- Data for Name: django_content_type; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.django_content_type (id, app_label, model) FROM stdin;
1	admin	logentry
2	auth	permission
3	auth	group
4	contenttypes	contenttype
5	sessions	session
6	users	user
7	users	profile
8	users	follow
9	users	userpreference
10	users	usergalleryimage
11	users	userscrap
12	restaurant	restaurant
13	restaurant	restaurantmenu
14	menu	menucandidate
15	menu	menu
16	recommendation	embeddingcache
17	recommendation	recommendationresult
18	recommendation	recommendationranking
19	psql_data	dbrestaurant
20	psql_data	dbmenu
\.


--
-- Data for Name: auth_permission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.auth_permission (id, name, content_type_id, codename) FROM stdin;
1	Can add log entry	1	add_logentry
2	Can change log entry	1	change_logentry
3	Can delete log entry	1	delete_logentry
4	Can view log entry	1	view_logentry
5	Can add permission	2	add_permission
6	Can change permission	2	change_permission
7	Can delete permission	2	delete_permission
8	Can view permission	2	view_permission
9	Can add group	3	add_group
10	Can change group	3	change_group
11	Can delete group	3	delete_group
12	Can view group	3	view_group
13	Can add content type	4	add_contenttype
14	Can change content type	4	change_contenttype
15	Can delete content type	4	delete_contenttype
16	Can view content type	4	view_contenttype
17	Can add session	5	add_session
18	Can change session	5	change_session
19	Can delete session	5	delete_session
20	Can view session	5	view_session
21	Can add user	6	add_user
22	Can change user	6	change_user
23	Can delete user	6	delete_user
24	Can view user	6	view_user
25	Can add profile	7	add_profile
26	Can change profile	7	change_profile
27	Can delete profile	7	delete_profile
28	Can view profile	7	view_profile
29	Can add follow	8	add_follow
30	Can change follow	8	change_follow
31	Can delete follow	8	delete_follow
32	Can view follow	8	view_follow
33	Can add user preference	9	add_userpreference
34	Can change user preference	9	change_userpreference
35	Can delete user preference	9	delete_userpreference
36	Can view user preference	9	view_userpreference
37	Can add user gallery image	10	add_usergalleryimage
38	Can change user gallery image	10	change_usergalleryimage
39	Can delete user gallery image	10	delete_usergalleryimage
40	Can view user gallery image	10	view_usergalleryimage
41	Can add user scrap	11	add_userscrap
42	Can change user scrap	11	change_userscrap
43	Can delete user scrap	11	delete_userscrap
44	Can view user scrap	11	view_userscrap
45	Can add restaurant	12	add_restaurant
46	Can change restaurant	12	change_restaurant
47	Can delete restaurant	12	delete_restaurant
48	Can view restaurant	12	view_restaurant
49	Can add restaurant menu	13	add_restaurantmenu
50	Can change restaurant menu	13	change_restaurantmenu
51	Can delete restaurant menu	13	delete_restaurantmenu
52	Can view restaurant menu	13	view_restaurantmenu
53	Can add menu candidate	14	add_menucandidate
54	Can change menu candidate	14	change_menucandidate
55	Can delete menu candidate	14	delete_menucandidate
56	Can view menu candidate	14	view_menucandidate
57	Can add menu	15	add_menu
58	Can change menu	15	change_menu
59	Can delete menu	15	delete_menu
60	Can view menu	15	view_menu
61	Can add embedding cache	16	add_embeddingcache
62	Can change embedding cache	16	change_embeddingcache
63	Can delete embedding cache	16	delete_embeddingcache
64	Can view embedding cache	16	view_embeddingcache
65	Can add recommendation result	17	add_recommendationresult
66	Can change recommendation result	17	change_recommendationresult
67	Can delete recommendation result	17	delete_recommendationresult
68	Can view recommendation result	17	view_recommendationresult
69	Can add recommendation ranking	18	add_recommendationranking
70	Can change recommendation ranking	18	change_recommendationranking
71	Can delete recommendation ranking	18	delete_recommendationranking
72	Can view recommendation ranking	18	view_recommendationranking
73	Can add Restaurant	19	add_dbrestaurant
74	Can change Restaurant	19	change_dbrestaurant
75	Can delete Restaurant	19	delete_dbrestaurant
76	Can view Restaurant	19	view_dbrestaurant
77	Can add Menu	20	add_dbmenu
78	Can change Menu	20	change_dbmenu
79	Can delete Menu	20	delete_dbmenu
80	Can view Menu	20	view_dbmenu
\.


--
-- Data for Name: auth_group_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.auth_group_permissions (id, group_id, permission_id) FROM stdin;
\.


--
-- Data for Name: db_restaurants; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.db_restaurants (id, external_id, name, category, phone, address, road_address, group1, group2, group3, category_code, category_code_list, place_images, avg_rating, review_count, created_at, updated_at, category_normalized, meaningful_name, inferred_menu, embedding_vector, geom) FROM stdin;
\.


--
-- Data for Name: db_menus; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.db_menus (id, external_id, name, price, description, images, recommend, index_in_rest, name_clean, taste_profile, allergen_info, created_at, updated_at, embedding_vector, restaurant_id) FROM stdin;
\.


--
-- Data for Name: users_user; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users_user (id, password, last_login, is_superuser, username, first_name, last_name, is_staff, is_active, date_joined, email, created_at, nickname) FROM stdin;
\.


--
-- Data for Name: django_admin_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.django_admin_log (id, action_time, object_id, object_repr, action_flag, change_message, content_type_id, user_id) FROM stdin;
\.


--
-- Data for Name: django_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.django_migrations (id, app, name, applied) FROM stdin;
1	contenttypes	0001_initial	2025-11-03 14:51:34.270495+00
2	contenttypes	0002_remove_content_type_name	2025-11-03 14:51:34.279477+00
3	auth	0001_initial	2025-11-03 14:51:34.349128+00
4	auth	0002_alter_permission_name_max_length	2025-11-03 14:51:34.358411+00
5	auth	0003_alter_user_email_max_length	2025-11-03 14:51:34.36578+00
6	auth	0004_alter_user_username_opts	2025-11-03 14:51:34.374869+00
7	auth	0005_alter_user_last_login_null	2025-11-03 14:51:34.382377+00
8	auth	0006_require_contenttypes_0002	2025-11-03 14:51:34.387216+00
9	auth	0007_alter_validators_add_error_messages	2025-11-03 14:51:34.395849+00
10	auth	0008_alter_user_username_max_length	2025-11-03 14:51:34.402425+00
11	auth	0009_alter_user_last_name_max_length	2025-11-03 14:51:34.409189+00
12	auth	0010_alter_group_name_max_length	2025-11-03 14:51:34.41793+00
13	auth	0011_update_proxy_permissions	2025-11-03 14:51:34.423169+00
14	auth	0012_alter_user_first_name_max_length	2025-11-03 14:51:34.429903+00
15	users	0001_initial	2025-11-03 14:51:34.550256+00
16	admin	0001_initial	2025-11-03 14:51:34.581619+00
17	admin	0002_logentry_remove_auto_add	2025-11-03 14:51:34.588821+00
18	admin	0003_logentry_add_action_flag_choices	2025-11-03 14:51:34.598058+00
19	menu	0001_initial	2025-11-03 14:51:34.626708+00
20	restaurant	0001_initial	2025-11-03 14:51:34.66999+00
21	menu	0002_initial	2025-11-03 14:51:34.690375+00
22	menu	0003_alter_menucandidate_image_url	2025-11-03 14:51:34.696624+00
23	psql_data	0001_initial	2025-11-03 14:51:34.727782+00
24	psql_data	0002_dbrestaurant_geom_alter_dbmenu_embedding_vector_and_more	2025-11-03 14:51:34.777454+00
25	psql_data	0003_alter_dbmenu_embedding_vector_and_more	2025-11-03 14:51:34.787926+00
26	recommendation	0001_initial	2025-11-03 14:51:34.881576+00
27	restaurant	0002_alter_restaurant_image_url_alter_restaurant_phone_and_more	2025-11-03 14:51:34.900823+00
28	sessions	0001_initial	2025-11-03 14:51:34.922669+00
29	users	0002_user_created_at_user_nickname_userpreference_and_more	2025-11-03 14:51:35.043061+00
30	users	0003_add_exploration_preference	2025-11-03 14:51:35.056986+00
\.


--
-- Data for Name: django_session; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.django_session (session_key, session_data, expire_date) FROM stdin;
\.


--
-- Data for Name: menu_menu; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.menu_menu (id, name, category, description, image_url, embedding, tag_name) FROM stdin;
\.


--
-- Data for Name: restaurant_restaurant; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.restaurant_restaurant (id, name, address, latitude, longitude, phone, image_url, source, created_at) FROM stdin;
\.


--
-- Data for Name: menu_menucandidate; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.menu_menucandidate (id, name, price, image_url, embedding, created_at, restaurant_id) FROM stdin;
\.


--
-- Data for Name: recommendation_embeddingcache; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.recommendation_embeddingcache (id, entity_type, entity_id, embedding) FROM stdin;
\.


--
-- Data for Name: recommendation_recommendationresult; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.recommendation_recommendationresult (id, query_text, input_context, recommended_menu_ids, scores, created_at, user_id) FROM stdin;
\.


--
-- Data for Name: recommendation_recommendationranking; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.recommendation_recommendationranking (id, rank, menu_id, recommendation_id) FROM stdin;
\.


--
-- Data for Name: restaurant_restaurantmenu; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.restaurant_restaurantmenu (id, menu_id, restaurant_id) FROM stdin;
\.


--
-- Data for Name: spatial_ref_sys; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.spatial_ref_sys (srid, auth_name, auth_srid, srtext, proj4text) FROM stdin;
\.


--
-- Data for Name: users_follow; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users_follow (id, status, created_at, follower_id, following_id) FROM stdin;
\.


--
-- Data for Name: users_profile; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users_profile (id, bio, preferences, updated_at, user_id) FROM stdin;
\.


--
-- Data for Name: users_user_groups; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users_user_groups (id, user_id, group_id) FROM stdin;
\.


--
-- Data for Name: users_user_user_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users_user_user_permissions (id, user_id, permission_id) FROM stdin;
\.


--
-- Data for Name: users_usergalleryimage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users_usergalleryimage (id, image_url, ai_label, category_tag, embedding, created_at, user_id) FROM stdin;
\.


--
-- Data for Name: users_userpreference; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users_userpreference (id, spicy_level, sweet_level, salty_level, allergies, disliked_ingredients, favorite_cuisines, created_at, user_id, exploration_preference) FROM stdin;
\.


--
-- Data for Name: users_userscrap; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users_userscrap (id, created_at, restaurant_id, user_id) FROM stdin;
\.


--
-- Data for Name: geocode_settings; Type: TABLE DATA; Schema: tiger; Owner: -
--

COPY tiger.geocode_settings (name, setting, unit, category, short_desc) FROM stdin;
\.


--
-- Data for Name: pagc_gaz; Type: TABLE DATA; Schema: tiger; Owner: -
--

COPY tiger.pagc_gaz (id, seq, word, stdword, token, is_custom) FROM stdin;
\.


--
-- Data for Name: pagc_lex; Type: TABLE DATA; Schema: tiger; Owner: -
--

COPY tiger.pagc_lex (id, seq, word, stdword, token, is_custom) FROM stdin;
\.


--
-- Data for Name: pagc_rules; Type: TABLE DATA; Schema: tiger; Owner: -
--

COPY tiger.pagc_rules (id, rule, is_custom) FROM stdin;
\.


--
-- Data for Name: topology; Type: TABLE DATA; Schema: topology; Owner: -
--

COPY topology.topology (id, name, srid, "precision", hasz) FROM stdin;
\.


--
-- Data for Name: layer; Type: TABLE DATA; Schema: topology; Owner: -
--

COPY topology.layer (topology_id, layer_id, schema_name, table_name, feature_column, feature_type, level, child_id) FROM stdin;
\.


--
-- Name: auth_group_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.auth_group_id_seq', 1, false);


--
-- Name: auth_group_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.auth_group_permissions_id_seq', 1, false);


--
-- Name: auth_permission_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.auth_permission_id_seq', 80, true);


--
-- Name: django_admin_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.django_admin_log_id_seq', 1, false);


--
-- Name: django_content_type_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.django_content_type_id_seq', 20, true);


--
-- Name: django_migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.django_migrations_id_seq', 30, true);


--
-- Name: menu_menu_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.menu_menu_id_seq', 1, false);


--
-- Name: menu_menucandidate_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.menu_menucandidate_id_seq', 1, false);


--
-- Name: recommendation_embeddingcache_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.recommendation_embeddingcache_id_seq', 1, false);


--
-- Name: recommendation_recommendationranking_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.recommendation_recommendationranking_id_seq', 1, false);


--
-- Name: recommendation_recommendationresult_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.recommendation_recommendationresult_id_seq', 1, false);


--
-- Name: restaurant_restaurant_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.restaurant_restaurant_id_seq', 1, false);


--
-- Name: restaurant_restaurantmenu_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.restaurant_restaurantmenu_id_seq', 1, false);


--
-- Name: users_follow_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_follow_id_seq', 1, false);


--
-- Name: users_profile_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_profile_id_seq', 1, false);


--
-- Name: users_user_groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_user_groups_id_seq', 1, false);


--
-- Name: users_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_user_id_seq', 1, false);


--
-- Name: users_user_user_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_user_user_permissions_id_seq', 1, false);


--
-- Name: users_usergalleryimage_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_usergalleryimage_id_seq', 1, false);


--
-- Name: users_userpreference_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_userpreference_id_seq', 1, false);


--
-- Name: users_userscrap_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_userscrap_id_seq', 1, false);


--
-- Name: topology_id_seq; Type: SEQUENCE SET; Schema: topology; Owner: -
--

SELECT pg_catalog.setval('topology.topology_id_seq', 1, false);


--
-- PostgreSQL database dump complete
--

