.PHONY: compile archive clean

compile:
	mkdir -p build
	hetu compile src/plugin.ht build/plugin.out

archive: compile
	mkdir -p build/archive
	cp plugin.json build/plugin.out build/archive/
	cp assets/logo.png build/archive/ 2>/dev/null || true
	cd build/archive && rm -f ../plugin.smplug && zip -q -r ../plugin.smplug .
	cp build/plugin.smplug .
	@echo "✓ plugin.smplug"

clean:
	rm -rf build plugin.smplug
