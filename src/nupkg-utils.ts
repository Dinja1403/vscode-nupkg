import * as versionParser from './version-parser';

function getDependenciesWithoutFramework(metadata) {
    return metadata.dependencies && metadata.dependencies[0] && metadata.dependencies[0].dependency ? metadata.dependencies[0].dependency : [];
}

function getDependenciesByFramework(metadata) {
    return metadata.dependencies && metadata.dependencies[0] && metadata.dependencies[0].group ? metadata.dependencies[0].group : [];
}

function skipInMetadata(section) {
    return section !== 'dependencies' && section !== 'references' && section !== 'frameworkAssemblies'
}

function createNuGetAsText(nugetSpec: any): any {
    // r is Result object
    let r = {}

    if (nugetSpec.package && nugetSpec.package.metadata && nugetSpec.package.metadata[0]) {
        let metadata = nugetSpec.package.metadata[0] || [];
        let metadataKeys = Object.keys(metadata).filter(m => m !== 'dependencies') || [];
        let dependenciesByFramework = getDependenciesByFramework(metadata);
        let dependenciesWithoutFramework = getDependenciesWithoutFramework(metadata);
        let references = metadata.references && metadata.references[0] && metadata.references[0].reference ? metadata.references[0].reference : []
        let dependencyByFrameworkKeys = Object.keys(dependenciesByFramework) || [];
        let frameworkAssemblies = metadata.frameworkAssemblies && metadata.frameworkAssemblies[0] && metadata.frameworkAssemblies[0].frameworkAssembly ? metadata.frameworkAssemblies[0].frameworkAssembly : [];
        let frameworkAssembliesKeys = Object.keys(frameworkAssemblies) || [];

        // Metadata
        if (metadataKeys.length) r['Metadata'] = {};
        metadataKeys.filter(skipInMetadata).forEach(k => r['Metadata'][k] = metadata[k].toString())

        // References
        if (references.length) {
            r['References'] = references.map(r => r.$)
        }

        // Dependencies by Framework
        if (dependencyByFrameworkKeys.length) r['Dependencies'] = r['Dependencies'] || {};
        dependencyByFrameworkKeys.forEach(k => {
            let framework = dependenciesByFramework[k];
            let frameworkName = framework.$ && framework.$.targetFramework ? framework.$.targetFramework : 'All Frameworks'
            r['Dependencies'][frameworkName] = {}
            let dependency = r['Dependencies'][frameworkName]

            if (framework.dependency) {
                framework.dependency.forEach(d => dependency[d.$.id] = versionParser.parseDependencyVersion(d.$.version))
            } else {
                dependency = `No dependencies.`
            }
        })

        // Dependencies without Framework
        if (dependenciesWithoutFramework.length) r['Dependencies'] = r['Dependencies'] || {};
        dependenciesWithoutFramework.forEach(k => {
            r['Dependencies'][k.$.id] = versionParser.parseDependencyVersion(k.$.version)
        })

        // frameworkAssemblies
        if (frameworkAssembliesKeys.length) r['Framework Assemblies'] = {};
        frameworkAssembliesKeys.forEach(k => r['Framework Assemblies'][frameworkAssemblies[k].$.targetFramework || 'All'] = frameworkAssemblies[k].$.assemblyName);
    }

    return r;
}

export function getTextForNuPkgContents(filePath): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        var nupkgReader = require('smart-nupkg-metadata-reader');
        var yaml = require('js-yaml');
        nupkgReader.readMetadata(filePath, function (result, error) {
            if (error) {
                return reject();
            }
            let yamlString = yaml.safeDump(createNuGetAsText(result));
            return resolve(yamlString);
        });
    });
}
