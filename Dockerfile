FROM denoland/deno:2.1.4 AS deno-base


RUN apt-get update && apt-get install -y python3 python3-pip
RUN pip install --no-cache-dir numpy --break-system-packages


ARG GIT_REVISION
ENV DENO_DEPLOYMENT_ID=${GIT_REVISION}

WORKDIR /app

COPY . .  

EXPOSE 8000

CMD ["run", "-A", "main.ts"]
