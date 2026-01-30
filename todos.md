# Files to write down todos

---

## Open Todos

### Thecnical todos

- add logging
- add proper response handeling with interceptor and response message decorator
 
### Architectual todos

- add mail server for 2 factor

### Other todos

- add caching for optimization
- add lazyloading for long lists
- implement faster build option
- add calender functionality
- implement additional authentication (Github, Google and similar);
- implement Google, Outlook and similar Calendar export
- add i18n
- add auto format on git commit

---

## Done / Currently implementing todos

### Thecnical todos

- add Database (added Prisma with simple schema and docker postgres implementation)
- Add passport for authentication (Implemented Local and JWT strategy for authentication)
- add bycrypt for encryptions (implemented bycrpt for pasword hashing)
- add validation (added validation pipe seems to work for dto's)
- add refresh token (refresh token functionality was added)
- add cookie support for refresh tokens (implement complete jwt cookies support, makes it easier to test and handle with browser applications)
- add user extraction from request with injectable (added custom decorator to extract user object)
- add custom validations (added custom valdidator for password)

### Architectual todos

- add env (added env)
- testing (added unit and integration tests for User Auth and passport strategies plus 2e2 testing for auth controller)

### other todos

- update readme (added first simple Readme)
- add testing (added integration and e2e tests for all implemented endpoints and services)
- Add Swagger for documentation (added swagger to the app for api endpoint documentation)
