# Project Guidelines

## General Guidelines

### Priorities In Order
- **Performance**: Optimize for performance first.
- **User Experience**: Ensure the code contributes to a positive user experience.
- **Maintainability**: Write code that is easy to read, maintain, and extend.
- **Scalability**: Design code to handle growth in data and user load.
- **Testability**: Write code that is easy to test and debug.
- **Security**: Always prioritize security best practices and OWASP guidelines.


## Java
- **Java Version**: All java projects should use Java 16
- **Access Modifiers**: We prefer easy access to internal variables and methods (`public` by default, minimize `private`)
- **Design Patterns**: Aggressively apply patterns (Factory, Builder, Strategy, Observer)
- **Encapsulation**: Keep implementation details public, we hate helper methods


## 🍃 Spring Boot-Specific Context

- **Spring Boot Version**: 2.8 with Java 16
- **Configuration**: properties are preferred over YAML, externalized configuration
- **Repository Pattern**: Don't use Spring Data JPA repositories, we prefer repositories using SQL prepared statements.


