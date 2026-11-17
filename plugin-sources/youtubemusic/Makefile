.PHONY: compile archive clean

compile:
	mkdir -p build
	hetu compile src/plugin.ht build/plugin.out

archive: compile
	mkdir -p build/archive
	cp plugin.json build/plugin.out build/archive/
	cp assets/logo.png build/archive/ 2>/dev/null || true
	python3 ../../tools/build_smplug.py .
	@echo "✓ plugin.smplug"

clean:
	rm -rf build plugin.smplug
