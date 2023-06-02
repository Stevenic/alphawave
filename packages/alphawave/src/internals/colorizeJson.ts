const colorizer = require('json-colorizer');

export function colorizeJson(json: object|string): string {
    return colorizer(json, {
        pretty: true,
        colors: {
            BRACE: 'white',
            BRACKET: 'white',
            COLON: 'white',
            COMMA: 'white',
            STRING_KEY: 'white',
            STRING_LITERAL: 'green',
            NUMBER_LITERAL: 'blue',
            BOOLEAN_LITERAL: 'blue',
            NULL_LITERAL: 'blue'
        }
    });
}
