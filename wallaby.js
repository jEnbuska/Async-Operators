module.exports = function (wallaby) {
    return {
        files: [
            'src/**/*.js',
            'index.js',
            'tests/common.js',
            'package.json',
        ],

        tests: [
            'tests/**/*.test.js',
        ],
        env: {
            type: 'node',
            runner: 'node',
        },

        setup () {
            process.env.NODE_ENV = 'test';
        },

        testFramework: 'jest',
        compilers: {
            'src/**/*.js': wallaby.compilers.babel(),
            'index.js': wallaby.compilers.babel(),
            'tests/**/*.js': wallaby.compilers.babel(),
        },
    };
};
