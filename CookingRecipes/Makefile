.PHONY: start stop clean

start:
	docker-compose up -d

stop:
	docker-compose stop

clean:
	docker-compose down
	docker volume rm my-app_mongo-data
