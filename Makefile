.PHONY: lint, extension

lint:
	jshint js/*.js

extension:
	./deploy/deploy.sh
