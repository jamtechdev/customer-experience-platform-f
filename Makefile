# Set WEB_ROOT when deploying, e.g. make deploy WEB_ROOT=/var/www
.PHONY: deploy deploy-pull

deploy:
	./deploy.sh $(WEB_ROOT)

deploy-pull:
	./deploy.sh $(WEB_ROOT) --pull
