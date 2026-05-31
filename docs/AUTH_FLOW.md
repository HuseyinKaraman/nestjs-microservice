# Auth Akışı — SignIn Nasıl Çalışır?

## Genel Akış Diyagramı

```mermaid
sequenceDiagram
    participant C as Client (HTTP)
    participant GUARD as LocalAuthGuard
    participant STRATEGY as LocalStrategy
    participant US as UsersService
    participant DB as MongoDB
    participant CTRL as AuthController
    participant SVC as AuthService
    participant JWT as JwtService

    C->>GUARD: POST /auth/signin { email, password }
    Note over GUARD: @UseGuards(LocalAuthGuard)<br/>İsteği yakalar

    GUARD->>STRATEGY: canActivate() → validate(email, password)
    Note over STRATEGY: Passport'un "local" stratejisi<br/>usernameField: 'email'

    STRATEGY->>US: validateUser(email, password)
    US->>DB: findOne({ email })
    DB-->>US: user document
    US->>US: bcrypt.compare(password, user.password)
    
    alt Şifre yanlış
        US-->>STRATEGY: UnauthorizedException
        STRATEGY-->>C: 401 Unauthorized
    else Şifre doğru
        US-->>STRATEGY: User
    end

    STRATEGY-->>GUARD: user nesnesi
    Note over GUARD: user → request.user'a atar

    GUARD-->>CTRL: Guard geçildi, handler çalışır

    CTRL->>CTRL: @CurrentUser() decorator<br/>request.user'ı alır
    CTRL->>SVC: signIn(user, response)
    SVC->>JWT: sign({ userId })
    JWT-->>SVC: JWT token
    SVC->>SVC: expires hesapla (JWT_EXPIRATION)
    SVC-->>CTRL: response.cookie('jwt', token, { httpOnly, expires })

    CTRL-->>C: { message: 'Signed in successfully' } + Set-Cookie: jwt=...
```

---

## Kavramlar

### 1. Guard Nedir?

Guard, bir route handler çalışmadan **önce** devreye giren bir kapı bekçisidir.  
`canActivate()` metodu `true` dönerse istek geçer, `false`/exception dönerse **401 Unauthorized** fırlatılır.

```mermaid
flowchart LR
    REQ[HTTP İsteği] --> G{Guard\ncanActivate?}
    G -- true --> HANDLER[Controller Handler]
    G -- false --> ERR[401 Unauthorized]
```

```typescript
// local-auth.guard.ts
export class LocalAuthGuard extends AuthGuard('local') {}
```

`AuthGuard('local')` → Passport'un `local` stratejisini tetikler.  
`@UseGuards(LocalAuthGuard)` → Bu decorator ile controller metoduna bağlanır.

---

### 2. Strategy (Strateji) Nedir?

Strategy, kimlik doğrulama **mantığının** yazıldığı yerdir.  
Passport.js'in sağladığı bir yapıdır. Her strateji farklı bir doğrulama yöntemi uygular:

| Strateji | Açıklama |
|---|---|
| `local` | Email + şifre ile doğrulama |
| `jwt` | JWT token ile doğrulama |
| `google` | Google OAuth ile doğrulama |

```typescript
// local.strategy.ts
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    super({ usernameField: 'email' }); // default 'username' yerine 'email' kullan
  }

  async validate(email: string, password: string) {
    // dönen değer → request.user'a atanır
    return await this.usersService.validateUser(email, password);
  }
}
```

```mermaid
flowchart TD
    A[Guard tetiklenir] --> B[LocalStrategy.validate çalışır]
    B --> C[UsersService.validateUser]
    C --> D{bcrypt.compare}
    D -- Eşleşti --> E[User döner\n→ request.user]
    D -- Eşleşmedi --> F[UnauthorizedException]
```

---

### 3. Decorator Nedir?

Decorator, bir sınıfa, metoda veya parametreye **metadata ekleyen** ya da davranışını değiştiren özel bir fonksiyondur.

#### `@CurrentUser()` — Custom Param Decorator

```typescript
// current-user.decorator.ts
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest().user  // request.user'ı döndür
);
```

```mermaid
flowchart LR
    REQ[request.user\nGuard tarafından set edildi] -->|CurrentUser| PARAM[Controller parametresi\nuser: User]
```

Guard → Strategy → `request.user = userDoc` → `@CurrentUser()` bunu alır.

---

### 4. SignIn Tam Akışı (Özet)

```mermaid
flowchart TD
    A["POST /auth/signin\n{ email, password }"] --> B["@UseGuards(LocalAuthGuard)"]
    B --> C["LocalStrategy.validate(email, password)"]
    C --> D["UsersService.validateUser()"]
    D --> E["bcrypt ile şifre karşılaştır"]
    E -->|Başarısız| Z["401 Unauthorized"]
    E -->|Başarılı| F["User → request.user"]
    F --> G["AuthController.signIn()"]
    G --> H["@CurrentUser() → user al"]
    H --> I["AuthService.signIn(user, response)"]
    I --> J["JWT oluştur: sign({ userId })"]
    J --> K["Cookie'ye yaz: jwt=token\nhttpOnly + expires"]
    K --> L["{ message: 'Signed in successfully' }"]
```

---

### 5. Cookie'de JWT

```mermaid
flowchart LR
    JWT["JwtService.sign(payload)"] --> TOKEN["eyJhbGci..."]
    TOKEN --> COOKIE["Set-Cookie: jwt=eyJhbGci...\nHttpOnly | Expires: ..."]
    COOKIE --> BROWSER["Tarayıcı otomatik\nsaklar ve gönderir"]
```

- `httpOnly: true` → JavaScript ile okunamaz (XSS koruması)
- `expires` → `JWT_EXPIRATION` saniye sonra geçersiz olur

---

### Mimari Özet

```mermaid
graph LR
    subgraph "HTTP Katmanı"
        REQ[İstek]
    end

    subgraph "Guard Katmanı"
        G[LocalAuthGuard]
    end

    subgraph "Strateji Katmanı"
        S[LocalStrategy]
    end

    subgraph "Servis Katmanı"
        US[UsersService]
        AS[AuthService]
    end

    subgraph "Controller Katmanı"
        CTRL[AuthController]
        DEC["@CurrentUser()"]
    end

    REQ --> G --> S --> US
    US --> S
    S --> G --> CTRL
    DEC --> CTRL --> AS
```
