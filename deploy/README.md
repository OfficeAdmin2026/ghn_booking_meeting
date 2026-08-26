# Self-host deploy — GHN Booking Meeting (test server)

Triển khai độc lập trên server riêng (`root@10.43.100.249`), **không liên quan** tới stack
production hiện có (Vercel + Render + Supabase — xem `../CLAUDE.md`). Dùng để test/demo nội bộ
trước khi gắn domain + SSO thật.

---

## Kiến trúc

```
Browser → [Traefik — do người dùng tự cấu hình, chưa có trong compose này]
            → frontend (nginx, container, port 80 → publish host:8080)
                → /api/*  proxy nội bộ (docker network) → backend:5000
                → còn lại  serve React SPA build
          backend (Node/Express, container, KHÔNG publish port ra host)
            → postgres (container, KHÔNG publish port ra host, volume `deploy_pgdata`)
```

- Chỉ **frontend** publish ra host (`8080:80`). Backend & Postgres chỉ nghe trong docker network
  nội bộ — quyết định có chủ ý (xem lịch sử chat lúc setup), giữ đúng thiết kế gốc trong
  `frontend/nginx.conf` (proxy `/api/` → `http://backend:5000/api/`, cùng origin nên không cần CORS).
- `VITE_API_URL` build với giá trị `/api` (relative) — không hardcode domain/IP, nhờ nginx proxy.

## Vị trí file

| Máy | Đường dẫn |
|---|---|
| Local (nguồn) | `/Users/huyenntt/Documents/GHN/6.Web/ghn_booking_meeting/{backend,frontend,deploy}` |
| Remote (build & chạy thật) | `/opt/ghn-booking-meeting/{backend,frontend,deploy}` |

**Không tự đồng bộ hai bên.** Sửa code xong ở local → phải rsync sang remote → rebuild (xem mục
Redeploy bên dưới). Chưa có git/CI trên remote.

## Secrets

`deploy/.env` (trên cả local và remote, **gitignored** qua `**/.env`) chứa `POSTGRES_PASSWORD` và
`JWT_SECRET` — random, sinh bằng `openssl rand -hex`. Không có bản backup nào khác ngoài 2 chỗ này;
nếu mất, tạo lại được (không cần khớp giá trị cũ) nhưng sẽ invalidate mọi JWT đang tồn tại (user
phải đăng nhập lại) — riêng `POSTGRES_PASSWORD` đổi thì phải đổi luôn password trong Postgres
(`ALTER ROLE`), không thể chỉ sửa `.env` vì password đã set 1 lần lúc container postgres init.

## DB seed — vấn đề đã phát hiện & xử lý

`backend/SETUP_DATABASE.sql` (schema + seed rooms/demo users) được viết **trước khi** có tính năng
đăng nhập-bằng-MSNV qua bảng allowlist (`allowed_employees`, chỉ tồn tại dưới dạng Sequelize model,
không có trong file SQL này). Nếu chạy nguyên file này trên DB trống, **không ai đăng nhập được**,
kể cả admin.

Đã xử lý:
1. `deploy/postgres-init/01-setup.sql` = copy của `SETUP_DATABASE.sql` + thêm 1 dòng insert user
   admin test (`employee_id = ADMIN01`, role admin) — chạy tự động khi container Postgres khởi tạo
   lần đầu (`docker-entrypoint-initdb.d`).
2. Bảng `allowed_employees` chỉ được tạo **sau khi backend khởi động lần đầu** (Sequelize
   `sequelize.sync()`), nên dòng allowlist tương ứng phải insert **thủ công sau khi stack đã up**:
   ```bash
   docker compose -f docker-compose.prod.yml exec -T postgres psql -U ghn_app -d ghn_meeting_room_booking -c \
     "INSERT INTO allowed_employees (id, employee_id, full_name, department, email) VALUES (gen_random_uuid(),'ADMIN01','Admin Test','IT','admin.test@ghn.vn') ON CONFLICT (employee_id) DO NOTHING;"
   ```
   (Đã chạy 1 lần trên remote — chỉ cần chạy lại nếu volume `deploy_pgdata` bị xoá/tạo mới.)

Tài khoản test: MSNV `ADMIN01` — **chỉ dùng được khi SSO tắt** (xem mục dưới), giờ SSO đã bật nên
login-by-MSNV bị chặn hẳn ở backend (403). Muốn login thật phải qua GHN SSO, và MSNV thật phải có
trong `allowed_employees` trước (thêm qua trang Admin) — MSNV SSO trả về khớp với allowlist bằng
số MSNV, không phải email (GHN SSO không trả email trong id_token/userinfo).

## Login mode hiện tại — SSO thật đã bật (PRODUCTION)

`SSO_ENABLED=true` trong `docker-compose.prod.yml`, dùng credentials **production** lấy từ
`ghn_booking_meeting/.env` (root, file ghi chú của Huyền — không phải dotenv thật) — app "Phòng
Họp", đăng ký qua PhatLV (3079900):

```
SSO_BASE_URL=https://online-gateway.ghn.vn/sso-v2
SSO_CLIENT_ID / SSO_CLIENT_SECRET  → lưu trong deploy/.env (không commit) — cặp Production
SSO_REDIRECT_URI=https://datphonghop-api.ghn.vn/api/auth/sso/callback
SSO_FRONTEND_URL / ALLOWED_ORIGINS=https://datphonghop.ghn.vn
```

Ban đầu bật bằng cặp Staging (`dev-online-gateway.ghn.vn`) để verify flow trước, sau đó đã chuyển
hẳn sang Production theo yêu cầu — verify lại `GET /api/auth/sso/login` redirect đúng sang
`online-gateway.ghn.vn` với đúng `client_id` production.

Code (`SsoService.js`) đã verify đúng chuẩn tài liệu OIDC guide (`sso-v2-oidc-integration-guide`):
authorize URL, exchange code (`client_secret_basic`), verify id_token qua JWKS (iss/exp/nonce —
cố tình bỏ check `aud` vì token thật GHN SSO trả `aud` rỗng, khác tài liệu), userinfo. Đã test
thực tế trên remote: `GET /api/auth/sso/login` redirect đúng sang authorize endpoint với đủ tham
số, `POST /api/auth/login` (đường cũ) trả 403 đúng như kỳ vọng.

**Domain `datphonghop.ghn.vn` / `datphonghop-api.ghn.vn` hiện trỏ qua ingress ở `167.254.73.248`
(IP ingress bên ngoài của GHN), CHƯA route vào `10.43.100.249`.** Tới khi Huyền cấu hình Traefik ở
ingress trỏ 2 domain này về `10.43.100.249:8080` (cả 2 domain đều route về cùng port 8080 —
`frontend/nginx.conf` dùng `server_name _` bắt hết, tự phân biệt `/api/*` vs SPA bằng path chứ
không theo hostname, nên KHÔNG cần route riêng domain "-api" sang port backend), thì:
- Không login được qua raw IP (`http://10.43.100.249:8080`) nữa — login cũ bị chặn (SSO bật), còn
  SSO login sẽ redirect đi rồi quay về domain thật chứ không quay lại được IP.
- Chỉ test được đầy đủ vòng lặp SSO sau khi ingress đã route xong 2 domain trên.

**Admin bootstrap:** đã seed sẵn MSNV `3091620` vào `allowed_employees` + `users` (role `admin`,
`full_name` placeholder "Admin (chờ đăng nhập SSO)" — sẽ tự được ghi đè bằng tên thật lấy từ SSO
claims ngay lần đăng nhập đầu). Đây là MSNV thật của Huyền — người đầu tiên login qua SSO thật sẽ
vào thẳng với quyền admin, từ đó tự thêm MSNV khác qua trang Admin.

## Redeploy sau khi sửa code

```bash
rsync -az --delete \
  --exclude 'node_modules' --exclude '.git' --exclude 'dist' --exclude '.DS_Store' \
  --exclude 'backend/.env' --exclude 'frontend/.env.local' \
  backend frontend deploy \
  root@10.43.100.249:/opt/ghn-booking-meeting/

ssh root@10.43.100.249 "cd /opt/ghn-booking-meeting/deploy && docker compose -f docker-compose.prod.yml up -d --build"
```

## Việc còn lại (chưa làm — chờ input từ Huyền)

- [x] SSO thật **production** đã bật, đã verify authorize URL + block route login cũ — xong ở phần backend.
- [ ] Traefik ở ingress `167.254.73.248`: route `datphonghop.ghn.vn` **và**
      `datphonghop-api.ghn.vn` cùng về `10.43.100.249:8080` (không cần port riêng cho "-api", xem
      giải thích ở mục Login mode). TLS terminate ở Traefik, backend/container nói HTTP thường.
- [ ] Sau khi ingress route xong: test full vòng SSO thật qua `https://datphonghop.ghn.vn`, thêm ít
      nhất 1 MSNV thật vào allowlist trước (trang Admin, hoặc cần 1 admin account có sẵn — hiện
      chưa ai login được để vào trang Admin nữa vì `ADMIN01` bị khoá cùng với SSO bật; nếu cần mở
      lại đường tắt để lần đầu vào Admin, báo tôi bật tạm `ALLOW_LOGIN_WITHOUT_SSO=true` rồi tắt lại).
- [ ] Xoá seed data mẫu (5 user demo, 3 booking mẫu, account test `ADMIN01`) trước khi dùng thật.
- [ ] Backup định kỳ cho volume `deploy_pgdata` (hiện chưa có).
- [ ] `ufw` đang inactive trên server — mọi port đang mở theo iptables mặc định ACCEPT. Nếu Traefik
      là điểm vào duy nhất, nên bật ufw giới hạn (22, 80, 443) sau khi Traefik chạy ổn.
