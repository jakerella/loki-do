
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
	// deploy CMD mock
	var deployMock;
	var deployCmdMock = function () {
		return deployMock();
	};
	// config mock
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
		deployMock = function () {
			var deferred = Q.defer(),
				promise = deferred.promise;
			deferred.resolve();
			return promise;
		};
		configMock = {
			hostname: 'a2mock.com',
			client_id: '1234567890987654321',
			api_key: 'abcdefghijklmnopqrstuvwxyz',
			ssh_key_id: '123456',
			public_ssh_key: '/mock/key.pub',
			private_ssh_key: 'mock/key',
			enable_logging: true,
			scripts_path: '/mock/scripts',
			log_file: '/mock/tc.log'
		};
		_consoleLog = console.log;
		_consoleError = console.error;
		console.log = chai.spy(function() {}); // we don't really want to log stuff
		console.log._real = _consoleLog; // just in case we need it
		console.error = chai.spy(function() {}); // we don't really want to log stuff
		execute = executeFactory(deployCmdMock, fileToJSONMock, speedBoatMock);
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
			expect(result.path).to.be.null;

		});

		it('should parse command and path out of correct entries', function() {
			var result = execute.parseArgsAndOptions([
				'node',
				'script/path.js',
				'foo',
				'/path/to/project'
			]);

			expect(result.command).to.equal('foo');
			expect(result.path).to.equal('/path/to/project');

		});

		it('should parse options only after command and path', function() {
			var result = execute.parseArgsAndOptions([
				'--foo1=bar1',
				'--foo2=bar2',
				'--foo3=bar3',
				'--foo4=bar4',
				'--foo5=bar5',
				'--foo6=bar6'
			]);

			expect(result.command).to.equal('--foo3=bar3');
			expect(result.path).to.equal('--foo4=bar4');
			expect(result.foo5).to.equal('bar5');
			expect(result.foo6).to.equal('bar6');

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

		it('should show log when executing command', function() {
			var result = execute.main([
				'node',
				'script/path.js',
				'deploy',
				'.',
				'--doconfig=../test/doconfig.json'
			]);

			expect(result).to.be.a.object;
			expect(result.then).to.be.a.function;
			return result.then(
				function() {
					expect(console.log).to.have.been.called(3);
					expect(execute.showUsage).to.not.have.been.called();
				},
				function() {
					throw new Error('Should not have received error on deploy');
				}
			);
		});

	});

});
