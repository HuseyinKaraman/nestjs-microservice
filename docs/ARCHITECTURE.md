# Sleepr — Microservices Mimarisi

> NestJS'e yeni başlayanlar için adım adım açıklama.

---

## 1. Genel Bakış — Servisler Nasıl Haberleşiyor?

Bu projede **iki ayrı NestJS uygulaması** birbirinden bağımsız çalışır:

| Servis | Port (HTTP) | Port (TCP) | Görev |
|---|---|---|---|
| **auth** | 3001 | 3002 | Kullanıcı kaydı, giriş, JWT üretimi ve doğrulaması |
| **reservations** | 3000 | — | Rezervasyon CRUD işlemleri |

```mermaid
graph TD
    Client["🌐 İstemci (Browser / Postman)"]

    subgraph Reservations["reservations servisi :3000"]
        RC[ReservationsController]
        RS[ReservationsService]
        RR[ReservationsRepository]
        Guard["JwtAuthGuard (libs/common)"]
    end

    subgraph Auth["auth servisi :3001 / :3002"]
        AC[AuthController]
        AS[AuthService]
        UR[UsersRepository]
    end

    MongoDB1[("MongoDB\nreservations")]
    MongoDB2[("MongoDB\nusers")]

    Client -->|"HTTP POST /reservations\ncookie: Authentication=JWT"| RC
    RC -->|"canActivate()"| Guard
    Guard -->|"TCP: authenticate { Authentication: jwt }"| AC
    AC -->|"JwtStrategy.validate()"| UR
    UR --> MongoDB2
    AC -->|"user objesi döner"| Guard
    Guard -->|"req.user = user"| RC
    RC --> RS
    RS --> RR
    RR --> MongoDB1
```

> **Önemli:** `reservations` servisi JWT'yi **kendisi doğrulamaz**. TCP üzerinden `auth` servisine sorar. Bu sayede secret key yalnızca `auth` servisinde bulunur.

---

## 2. Login Akışı — Adım Adım

```mermaid
sequenceDiagram
    participant C as İstemci
    participant A as auth :3001
    participant DB as MongoDB (users)

    C->>A: POST /auth/signin { email, password }
    Note over A: LocalAuthGuard devreye girer
    A->>A: LocalStrategy.validate(email, password)
    A->>DB: findOne({ email })
    DB-->>A: user belgesi
    A->>A: bcrypt.compare(password, user.password)
    A-->>C: Set-Cookie: Authentication=<JWT>
```

1. İstemci email + password gönderir.
2. `LocalAuthGuard` → `LocalStrategy.validate()` çağırır.
3. Strateji şifreyi bcrypt ile doğrular.
4. `AuthService.signIn()` bir JWT imzalar ve cookie olarak tarayıcıya gönderir.

---

## 3. Rezervasyon Oluşturma — Adım Adım

```mermaid
sequenceDiagram
    participant C as İstemci
    participant R as reservations :3000
    participant A as auth :3002 (TCP)
    participant DB as MongoDB (reservations)

    C->>R: POST /reservations + cookie: Authentication=JWT
    Note over R: JwtAuthGuard.canActivate() çalışır
    R->>A: TCP mesajı: "authenticate" { Authentication: JWT }
    Note over A: auth'daki JwtAuthGuard + JwtStrategy çalışır
    A->>A: jwt.verify(token, JWT_SECRET)
    A-->>R: User { id, email, ... }
    Note over R: req.user = User set edilir
    R->>R: @CurrentUser() dan user.id alınır
    R->>DB: reservationsRepository.create({ ...dto, userId })
    DB-->>R: Kaydedilen rezervasyon
    R-->>C: 201 Created { reservation }
```

---

## 4. Guard Nedir? Nasıl Çalışır?

Guard, bir HTTP isteği **controller metoduna ulaşmadan önce** çalışan bir kapıcıdır.

```mermaid
flowchart LR
    Req["HTTP İsteği"] --> MW["Middleware"] --> Guard["Guard\ncanActivate()"]
    Guard -->|true| Pipe["Pipe / Validation"]
    Guard -->|false / throw| Err["401 Unauthorized"]
    Pipe --> Handler["Controller Metodu"]
```

```typescript
// Kullanımı — dekoratör olarak eklenir
@UseGuards(JwtAuthGuard)
@Post()
async create(@Body() dto: CreateReservationDto) { ... }
```

### Bu Projedeki Guard'lar

| Guard | Nerede? | Ne Yapar? |
|---|---|---|
| `LocalAuthGuard` | auth servisi | email/password doğrular (sadece `/signin`) |
| `JwtAuthGuard` (auth içi) | auth servisi | Passport ile JWT doğrular, `authenticate` endpoint'ini korur |
| `JwtAuthGuard` (libs/common) | reservations servisi | Cookie'deki JWT'yi auth servisine TCP ile sorar |

### libs/common JwtAuthGuard — Detay

```typescript
canActivate(context: ExecutionContext): Observable<boolean> {
  // 1. Cookie'den JWT'yi al
  const jwt = request.cookies?.Authentication;
  if (!jwt) return false;                        // JWT yoksa → 401

  // 2. auth servisine TCP mesajı gönder
  return this.authClient.send('authenticate', { Authentication: jwt }).pipe(
    tap(user => request.user = user),            // 3. user'ı request'e ekle
    map(() => true),                             // 4. guard'ı geçir
    catchError(() => throwError(                 // 5. hata gelirse → 401
      () => new UnauthorizedException()
    ))
  );
}
```

---

## 5. Strateji (Strategy) Nedir?

Strategy, "kimlik doğrulamanın **nasıl yapıldığını**" tanımlar. Guard sadece "çalıştır" der, strateji "nasıl çalıştırılır" bilir.

```mermaid
flowchart TD
    Guard["AuthGuard('jwt')"] -->|"Stratejiyi çağırır"| Strategy["JwtStrategy.validate()"]
    Strategy -->|"userId"| DB["UsersService.getUser()"]
    DB -->|"user objesi"| Passport["Passport → req.user = user"]
```

| Strateji | Tetikleyici | Doğrulama Yöntemi |
|---|---|---|
| `LocalStrategy` | `AuthGuard('local')` | email + password → bcrypt |
| `JwtStrategy` | `AuthGuard('jwt')` | Cookie'deki token → jwt.verify |

---

## 6. @CurrentUser() Dekoratörü Nedir?

`@CurrentUser()` bir **param dekoratörüdür**. Controller metodunun parametresine otomatik olarak `req.user` nesnesini enjekte eder.

```typescript
// Dekoratörün tanımı (libs/common)
export const CurrentUser = createParamDecorator(
  (_data, context: ExecutionContext) =>
    context.switchToHttp().getRequest().user   // sadece req.user'ı döndürür
);
```

```mermaid
flowchart LR
    Guard["JwtAuthGuard\nreq.user = User set eder"]
    -->|"request.user"| Dec["@CurrentUser()\nreq.user'ı okur"]
    --> Handler["create(@CurrentUser() user)\nuser.id kullanılır"]
```

```typescript
// Kullanımı
@Post()
async create(
  @Body() dto: CreateReservationDto,
  @CurrentUser() user: User     // ← Guard'ın set ettiği req.user gelir
) {
  return this.service.create(dto, user.id);
}
```

> **Guard + @CurrentUser() birlikte çalışır:**
> Guard `req.user`'ı set eder → `@CurrentUser()` o değeri okur.
> Guard olmadan `@CurrentUser()` her zaman `undefined` döner.

---

## 7. Proje Katmanları Özeti

```mermaid
graph TB
    subgraph "libs/common (paylaşılan kod)"
        LG["JwtAuthGuard"]
        LD["@CurrentUser()"]
        LDB["DatabaseModule"]
        LDTO["User"]
    end

    subgraph "apps/auth"
        AM["AuthModule"]
        AC2["AuthController"]
        AS2["AuthService"]
        LS["LocalStrategy"]
        JS["JwtStrategy"]
        UM["UsersModule"]
    end

    subgraph "apps/reservations"
        RM["ReservationsModule"]
        RC2["ReservationsController"]
        RS2["ReservationsService"]
    end

    LG --> RC2
    LD --> RC2
    LDB --> AM
    LDB --> RM
    LDTO --> LG
```

---

## 8. Akış Özeti — Tek Cümleyle

```
İstemci → [JWT cookie] → reservations guard → [TCP] → auth doğrular
       → user bilgisi döner → @CurrentUser() ile alınır → rezervasyon kaydedilir
```
