'use strict';

// @ts-check

const { camelCase } = require('change-case');

const is = (data, assert) => {
    for (const annotation of data.annotations) {
        if (assert(annotation)) {
            return true;
        }
    }

    return false;
};

const isInterface = (data) => is(data, a => 'interface' == a.toLowerCase());

const isAbstract = (data) => is(data, a => 'abstract' == a.toLowerCase());

const isFinal = (data) => is(data, a => 'final' == a.toLowerCase());

const isMemberAbstract = ({ classifiers }) => !!~classifiers.indexOf('*');

const isMemberStatic = ({ classifiers }) => !!~classifiers.indexOf('$');

const getExtends = (id, parsed) => {
    for (const { id1, id2, relation} of parsed.getRelations()) {
        if (
            id2 == id
            && 1 === relation.type1
            && !isInterface(parsed.getClass(id1))
        ) {
            return id1;
        }
    }

    return '';
};

const getImplements = (id, parsed) => parsed.getRelations().reduce(
    (impl, {id1, id2, relation}) => [
        ...impl,
        ...(
            id2 == id 
            && 1 === relation.type1 
            && isInterface(parsed.getClass(id1))
        ) ? [id1] : []
    ],
    []
);

const typeRegex = /(?<type>[\w\\]+)(~(?<genericType>[\w\\]+)~)?/i

const parseType = type => type ? type.match(typeRegex).groups || {} : {};

const propertyRegex = /(?<visibility>[\+\-\#\~])?(?<type>[\w\\~]+) (?<name>\w+)(?<classifiers>[\$]*)/i

const getVisibility = ({ visibility }) => ({
    '+': 'public',
    '-': 'private',
    '#': 'protected',
}[visibility]) || '';

const getType = ({ type = '', genericType = '' }) => type + (genericType ? `<${genericType}>` : '');

const getPropertyName = ({ name }) => `\$${camelCase(name)}`;

const parseProperties = data => data.members.reduce(
    (properties, m) => {
        const match = m.match(propertyRegex);

        if (match) {
            properties.push({
                static: isMemberStatic(match.groups),
                visibility: getVisibility(match.groups),
                type: getType(parseType(match.groups.type)),
                name: getPropertyName(match.groups),
            });
        }

        return properties;
    },
    []
);

const functionRegex = /(?<visibility>[\+\-\#\~])?(?<name>\w+)\((?<parameters>[^\)]*)\)(?<classifiers>[\*\$]*)( (?<type>[\w\\~]+))?/i

const getFunctionName = ({ name }) => camelCase(name);

const parseFunctions = data => data.methods.reduce(
    (functions, f) => {
        const match = f.match(functionRegex);

        if (match) {
            functions.push({
                abstract: isMemberAbstract(match.groups),
                static: isMemberStatic(match.groups),
                visibility: getVisibility(match.groups),
                name: getFunctionName(match.groups),
                type: getType(parseType(match.groups.type)),
                parameters: parseParameters(match.groups.parameters)
            });
        }

        return functions;
    },
    []
);

const parameterRegex = /((?<type>[\w\\~]+) )?(?<name>\w+)/i

const parseParameters = parameters => parameters.split(',').reduce((parameters, p) => {
    const match = p.trim().match(parameterRegex);

    if (match) {
        parameters.push({
            name: getPropertyName(match.groups),
            type: getType(parseType(match.groups.type)),
        });
    }

    return parameters;
}, []);

module.exports = {
    isInterface,
    isAbstract,
    isFinal,
    getExtends,
    getImplements,
    parseProperties,
    parseFunctions,
};
