FROM amazoncorretto:21-al2023-headless
ARG APP=api
COPY apps/${APP}/build/libs/app.jar /app/app.jar
RUN useradd --system --uid 10001 wellisha
USER 10001
WORKDIR /app
ENTRYPOINT ["java","-XX:MaxRAMPercentage=70","-jar","app.jar"]
