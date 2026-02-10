1. Add Referrals (POST /referral)

```bash
curl -X POST http://localhost:8080/referral \
-H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
-H "Content-Type: application/json" \
-d '{
    "api_key": "your-api-key",
    "codes": ["code1", "code2", "code3"]
}'
```

Response:

```json
{"added": 3}
```

2. View All Referrals (GET /referrals)

```bash
curl -X GET http://localhost:8080/referrals \
-H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Response:

```json
[
{
    "id": 1,
    "api_key": "your-api-key",
    "code": "code1",
    "shown": 0,
    "created_at": "2026-02-10T12:00:00.000Z"
},
...
]
```

3. Delete Referral (DELETE /referral/:id)

```bash
curl -X DELETE http://localhost:8080/referral/1 \
-H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```
Response: HTTP 204 (No Content)

---
Bonus: Additional Endpoints

Get One Unused Referral Code (Public)

```bash
curl -X GET http://localhost:8080/referral/your-api-key
```

Response:
```json
{"ref": "code1"}
```
Health Check (Public)

```bash
curl -X GET http://localhost:8080/health
```

Response:

```json
{"shown": 5, "available": 10}
```
---
Notes:
- Replace `YOUR_ADMIN_TOKEN` with your actual admin token (set via `ADMIN_TOKEN` environment variable)
- Replace `your-api-key` with the actual API key you want to use
- Change `localhost:8080` to your actual server URL if deployed elsewhere