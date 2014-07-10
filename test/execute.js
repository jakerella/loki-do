
    // libraries
var chai = require('chai'),
    spies = require('chai-spies'),
    expect = chai.expect,

    // source code
    execute = require('../src/execute.js');

// We need spies to see that our dependencies were called
chai.use(spies);

describe('execute module', function() {
    var _consoleLog;

    beforeEach(function() {
        _consoleLog = console.log;
        console.log = chai.spy(function() {}); // we don't really want to log stuff
    });

    afterEach(function() {
        console.log = _consoleLog;  // let's put the log method back
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
            execute.showUsage = chai.spy(function() {}); // we don't really want it to do anything
        });

        afterEach(function() {
            execute.showUsage = _showUsage;  // let's put the method back
        });

        it('should fail on no input', function() {
            expect(execute.main).to.throw(Error);
            expect(execute.showUsage).to.have.been.called(1);
        });

        it('should fail on no command', function() {
            var noCommand = ['node', 'script/path.js'];

            expect(function() { execute.main(noCommand); }).to.throw(Error);
            expect(execute.showUsage).to.have.been.called(1);
        });

        it('should fail on bad command', function() {
            var badCommand = ['node', 'script/path.js', 'foo', '/some/path'];

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
                '.'
            ]);

            expect(result).to.be.undefined;
            expect(console.log).to.have.been.called(1);
            expect(execute.showUsage).to.not.have.been.called();
        });

    });

});
