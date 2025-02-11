
FROM golang:1.22.4-alpine AS builder

RUN apk update && apk add --no-cache git gcc musl-dev sqlite sqlite-dev

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download


COPY . .

ENV CGO_ENABLED=1

RUN go build -o real-time-forum main.go


FROM alpine:latest


RUN apk --no-cache add ca-certificates sqlite sqlite-dev

WORKDIR /root/


COPY --from=builder /app/real-time-forum .


COPY frontend ./frontend


RUN mkdir -p /root/db

EXPOSE 8080

CMD ["./real-time-forum"]
