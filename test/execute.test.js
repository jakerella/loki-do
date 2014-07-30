
	// libraries
var chai = require('chai'),
	spies = require('chai-spies'),
	expect = chai.expect,
	Q = require('q'),

	// source code
	executeFactory = require('../src/execute.js');

// We need spies to see that our dependencies were called
chai.use(spies);

describe('execute module', function() {
	var runNpmMock;
	var runNpmCmdMock = function () {
		return runNpmMock;
	};
	var provisionMock;
	var provisionCmdMock = function () {
		return provisionMock;
	};
	var deployMock;
	var deployCmdMock = function () {
		return deployMock;
	};
	var configMock = {};
	var fileToJSONMock = function () {
		return configMock;
	};
	var speedBoatMock = function () {};
	speedBoatMock.prototype.plot = function (boxId, cmd) {
		return function (cb) { cb(null); };
	};

	// mocked execute module
	var execute,
		_consoleLog,
		_consoleError;

	beforeEach(function() {
		runNpmMock = chai.spy(function () {
			var deferred = Q.defer(),
				promise = deferred.promise;
			deferred.resolve();
			return promise;
		});
		provisionMock = chai.spy(function () {
			var deferred = Q.defer(),
				promise = deferred.promise;
			deferred.resolve();
			return promise;
		});
		deployMock = chai.spy(function () {
			var deferred = Q.defer(),
				promise = deferred.promise;
			deferred.resolve();
			return promise;
		});
		configMock = {
			hostname: 'a2mock.com',
            digital_ocean: {
                client_id: '1234567890987654321',
                api_key: 'abcdefghijklmnopqrstuvwxyz',
                ssh_key_id: '123456',
                public_ssh_key: '/mock/key.pub',
                private_ssh_key: 'mock/key',
                enable_logging: true,
                scripts_path: '/mock/scripts'
            },
			log_file: '/mock/tc.log'
		};

		_consoleLog = console.log;
		_consoleError = console.error;
		console.log = chai.spy(function() {}); // we don't really want to log stuff
		console.log._real = _consoleLog; // just in case we need it
		console.error = chai.spy(function() {}); // we don't really want to log stuff
		
		execute = executeFactory({
			runNpmCmd: runNpmCmdMock,
			provisionCmd: provisionCmdMock,
			deployCmd: deployCmdMock,
			fileToJSON: fileToJSONMock,
			SpeedBoat: speedBoatMock
		});
	});

	afterEach(function() {
		// let's put the console methods back
		console.log = _consoleLog;
		console.error = _consoleError;
	});

	describe('exports', function() {
		
		it('should have correct methods', function() {
			expect(execute.main).to.be.a.function;
			expect(execute.parseArgsAndOptions).to.be.a.function;
			expect(execute.showUsage).to.be.a.function;
		});

	});

	describe('usage helper', function() {
		
		it('should print usage to the console', function() {
			execute.showUsage();
			
			expect(console.log).to.have.been.called(1);
		});

	});

	describe('argument parser', function() {
		
		it('should return nulls for command and path with no input', function() {
			var result = execute.parseArgsAndOptions();

			expect(result.command).to.be.null;
			expect(result.vcsurl).to.be.null;
			expect(result.subdomain).to.be.null;
			expect(result.config).to.be.null;
			expect(result.configObject).to.be.a.object;
			expect(Object.keys(result.configObject).length).to.equal(0);
		});

		it('should parse command and path out of correct entries', function() {
			var result = execute.parseArgsAndOptions([
				'node',
				'script/path.js',
				'foo',
				'http://vcsurl.com'
			]);

			expect(result.command).to.equal('foo');
			expect(result.vcsurl).to.equal('http://vcsurl.com');

		});

		it('should parse options only after command and path', function() {
			var result = execute.parseArgsAndOptions([
				'--foo1=bar1',
				'--foo2=bar2',
				'--foo3=bar3',
				'--foo4=bar4',
				'--foo5=bar5',
				'--foo6=bar6',
				'--foo7=bar7',
				'--foo8=bar8'
			]);

			expect(result.command).to.equal('--foo3=bar3');
			expect(result.vcsurl).to.equal('--foo4=bar4');
			expect(result.subdomain).to.equal('--foo5=bar5');
			expect(result.config).to.equal('--foo6=bar6');
			expect(result.foo7).to.equal('bar7');
			expect(result.foo8).to.equal('bar8');

		});

	});

	describe('main method', function() {

		var _showUsage;

		beforeEach(function() {
			_showUsage = execute.showUsage;
			execute.showUsage = chai.spy(function() { }); // we don't really want it to do anything
		});

		afterEach(function() {
			execute.showUsage = _showUsage;  // let's put the method back
		});

		it('should fail on no input', function() {
			expect(function() { execute.main(); }).to.throw(Error);
			expect(execute.showUsage).to.have.been.called(1);
		});

		it('should fail on no command', function() {
			var noCommand = ['node', 'script/path.js'];

			expect(function() { execute.main(noCommand); }).to.throw(Error);
			expect(execute.showUsage).to.have.been.called(1);
		});

		it('should fail on bad command', function() {
			var badCommand = ['node', 'script/path.js', 'foo', '.'];

			expect(function() { execute.main(badCommand); }).to.throw(Error);
			expect(execute.showUsage).to.have.been.called(1);
		});

		it('should fail on no path', function() {
			var noPath = ['node', 'script/path.js', 'foo'];

			expect(function() { execute.main(noPath); }).to.throw(Error);
			expect(execute.showUsage).to.have.been.called(1);
		});

		it('should show usage on help option', function() {
			var result = execute.main([
				'node',
				'script/path.js',
				'--help'
			]);

			expect(result).to.be.undefined;
			expect(execute.showUsage).to.have.been.called(1);
		});

		it('should show usage on shorthand help option', function() {
			var result = execute.main([
				'node',
				'script/path.js',
				'-h'
			]);

			expect(result).to.be.undefined;
			expect(execute.showUsage).to.have.been.called(1);
		});

		it('should run npm command and log when executing command', function() {
			var result = execute.main([
				'node',
				'script/path.js',
				'test',
				'http://vcsurl.com',
				'test',
				'../test/config.json'
			]);

			expect(result).to.be.a.object;
			expect(result.then).to.be.a.function;
			return result.then(
				function() {
					expect(runNpmMock).to.have.been.called(1);
					expect(console.log).to.have.been.called(3);
					expect(execute.showUsage).to.not.have.been.called();
				},
				function() {
					throw new Error('Should not have received error on test');
				}
			);
		});

		it('should call custom command and log when executed', function() {
			var result = execute.main([
				'node',
				'script/path.js',
				'provision',
				'http://vcsurl.com',
				'test',
				'../test/config.json'
			]);

			expect(result).to.be.a.object;
			expect(result.then).to.be.a.function;
			return result.then(
				function() {
					expect(provisionMock).to.have.been.called(1);
					expect(console.log).to.have.been.called(3);
					expect(execute.showUsage).to.not.have.been.called();
				},
				function() {
					throw new Error('Should not have received error on provision');
				}
			);
		});

	});

});
