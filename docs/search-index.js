znaiSearchData = [["@@index@@liftwizard","","Liftwizard","Liftwizard","Liftwizard is a collection of bundles and add-ons for https://www.dropwizard.io/ Dropwizard, the Java framework for writing web services.There are very few dependencies between the bundles, so you can pick and choose the ones you want.The bundles can be loosely grouped into categories.Dropwizard configurationJSON serialization/deserializationServlet client/server logging https://github.com/goldmansachs/reladomo Reladomo ORM integration for DropwizardOther Dropwizard utilityIn this guide, we'll start with the application https://github.com/dropwizard/dropwizard/tree/master/dropwizard-example dropwizard-example which is a maven module that's part of the main Dropwizard repository. We'll gradually turn it into https://github.com/motlin/liftwizard/tree/master/liftwizard-example liftwizard-example , an application with an identical service api that uses as many Liftwizard features as possible."],["configuration@@environment-variables@@environmentconfigbundle","Configuration","Environment Variables","EnvironmentConfigBundle","The EnvironmentConfigBundle supports environment variable substitution inside Dropwizard configuration files.In the example applications, environment variable substitution is used for defaultName . yaml template: Hello, %s! defaultName: ${DW_DEFAULT_NAME:-Stranger} We can see this in action by running the render command, with and without the environment variable set. bash $ java -jar target/liftwizard-example-0.1.0.jar render example.yml --include-default INFO [2020-05-02 03:07:41,910] com.example.helloworld.cli.RenderCommand: DEFAULT => Hello, Stranger! $ DW_DEFAULT_NAME=EnvSubstitution java -jar target/liftwizard-example-0.1.0.jar render example.yml --include-default INFO [2020-05-02 03:08:05,685] com.example.helloworld.cli.RenderCommand: DEFAULT => Hello, EnvSubstitution! java @Override public void initialize(Bootstrap<HelloWorldConfiguration> bootstrap) { // Enable variable substitution with environment variables bootstrap.setConfigurationSourceProvider( new SubstitutingSourceProvider( bootstrap.getConfigurationSourceProvider(), new EnvironmentVariableSubstitutor(false) ) ); // ... } java @Override public void initialize(Bootstrap<HelloWorldConfiguration> bootstrap) { bootstrap.addBundle(new EnvironmentConfigBundle()); // ... }"],["configuration@@json5-configuration@@configuration-through-json5-instead-of-yaml","Configuration","Json5 Configuration","Configuration through json5 instead of yaml","Dropwizard's configuration is specified in yaml by default. While yaml has nice properties, you may prefer json or some other format.Dropwizard's https://www.dropwizard.io/en/latest/manual/core.html#configuration documentation claims:If your configuration file doesn't end in .yml or .yaml, Dropwizard tries to parse it as a JSON file.This is easily disproved by renaming example.yml to example.json and trying to run the application. It will incorrectly start without error.Since json syntax is a subset of yml syntax, you can go ahead and convert your configuration file to json without changing the file extension from yaml or yml. However, this approach doesn't prevent you from accidentally using yaml syntax.You can change your application to use json for its configuration using JsonConfigurationFactoryFactory . java @Override public void initialize(Bootstrap<HelloWorldConfiguration> bootstrap) { bootstrap.setConfigurationFactoryFactory(new JsonConfigurationFactoryFactory<>()); // ... } JsonConfigurationFactoryFactory uses json5 syntax by default, using optional features in Jackson. So you'll still be able to include comments inside your configuration files.You'll have to convert production configuration files. So example.yml becomes example.json5 . You'll also have to convert configuration files used by DropwizardAppRule in tests. So src/test/resources/test-example.yml becomes src/test/resources/test-example.json5"],["configuration@@ConfigLoggingBundle@@configloggingbundle","Configuration","ConfigLoggingBundle","ConfigLoggingBundle","The ConfigLoggingBundle logs the Dropwizard configuration to slf4j at INFO level, by serializing the in-memory configuration object to json. It does not echo the contents of the configuration file back. The output will contain default values that were not specified in the original configuration file. Some other values will be normalized or pretty printed.To turn it on, add ConfigLoggingBundle to the list of registered bundles. @Override public void initialize(Bootstrap<HelloWorldConfiguration> bootstrap) { bootstrap.setConfigurationFactoryFactory(new JsonConfigurationFactoryFactory<>()); bootstrap.addBundle(new EnvironmentConfigBundle()); bootstrap.addBundle(new ObjectMapperBundle()); bootstrap.addBundle(new ConfigLoggingBundle()); bootstrap.addBundle(new JerseyHttpLoggingBundle()); bootstrap.addBundle(new ClockBundle()); bootstrap.addBundle(new UUIDBundle()); bootstrap.addBundle(new H2Bundle()); bootstrap.addBundle(new NamedDataSourceBundle()); bootstrap.addBundle(new ConnectionManagerBundle()); bootstrap.addBundle(new ConnectionManagerHolderBundle()); bootstrap.addBundle(new ReladomoBundle()); bootstrap.addCommand(new RenderCommand()); bootstrap.addBundle(new AssetsBundle()); bootstrap.addBundle(new MigrationsBundle<HelloWorldConfiguration>() { @Override public DataSourceFactory getDataSourceFactory(HelloWorldConfiguration configuration) { return Iterate.getOnly(configuration.getNamedDataSourceFactories()); } }); bootstrap.addBundle(new ViewBundle<HelloWorldConfiguration>() { @Override public Map<String, Map<String, String>> getViewConfiguration(HelloWorldConfiguration configuration) { return configuration.getViewRendererConfiguration(); } }); } Now HelloWorldApplication will log something like this on startup: INFO 12:53:29 [main] {liftwizard.priority=-8, liftwizard.bundle=ConfigLoggingBundle} io.liftwizard.dropwizard.bundle.config.logging.ConfigLoggingBundle: Inferred Dropwizard configuration: json5 { \"template\": \"Hello, %s!\", \"defaultName\": \"Stranger\", \"configLoggingFactory\": { \"enabled\": true }, // ... \"metrics\": { \"frequency\": \"1 minute\", \"reporters\": [ ] } } Note that the metrics section at the end was not specified in test-example.json5 . It comes from serializing the output of io.dropwizard.Configuration.getMetricsFactory() .This output can be helpful for fleshing out the configuration file with default options to make it easier to edit. For example, it's much easier to flip a boolean flag from false to true than to first figure out where in the configuration file it belongs and the exact spelling of its key. @JsonProperty(\"metrics\") public MetricsFactory getMetricsFactory() { return metrics; } The ConfigLoggingBundle also logs the \"default\" configuration at the DEBUG level. It does this by instantiating a new copy of the configuration class using the default no-arg constructor, serializing it to json, and logging it. The default configuration output can be useful for finding redundant configuration to remove."],["jackson@@ObjectMapperBundle@@objectmapperbundle","Jackson","ObjectMapperBundle","ObjectMapperBundle","The ObjectMapperBundle configures the Jackson ObjectMapper used by Dropwizard for serializing and deserializing all responses, as well as for logging by bundles such as liftwizard-bundle-logging-config . ObjectMapperBundle supports configuring pretty-printing on or off, and serialization inclusion to any value in Jackson's JsonInclude.Include . ObjectMapperBundle also turns on all json5 features, turns on FAIL_ON_UNKNOWN_PROPERTIES , turns on STRICT_DUPLICATE_DETECTION , and turns on serialization of dates and Strings.To turn it on, add ObjectMapperBundle to the list of registered bundles. java @Override public void initialize(Bootstrap<HelloWorldConfiguration> bootstrap) { // JsonConfigurationFactoryFactory uses a separate ObjectMapper, and can be configured earlier bootstrap.setConfigurationFactoryFactory(new JsonConfigurationFactoryFactory<>()); bootstrap.addBundle(new EnvironmentConfigBundle()); bootstrap.addBundle(new ObjectMapperBundle()); // ConfigLoggingBundle uses the ObjectMapper configured by ObjectMapperBundle bootstrap.addBundle(new ConfigLoggingBundle()); // ... } You'll be able to see that ObjectMapperBundle is working because the output of ConfigLoggingBundle will now be pretty-printed by default."],["logging@@logging-modules@@logging-modules","Logging","Logging Modules","Logging modules","The Liftwizard logging modules add context to slf4j logging through MDC and through \"structured logging\". There are several bundles and servlet filters to choose from. You can use all of them or cherry-pick the ones that are useful to you.In order to see the logging in action, we'll need to configure a log format that includes mdc and markers. src/test/resources/test-example.json5 json5 { \"type\" : \"console\", \"timeZone\" : \"system\", \"logFormat\" : \"%highlight(%-5level) %cyan(%date{HH:mm:ss}) [%white(%thread)] %blue(%marker) {%magenta(%mdc)} %green(%logger): %message%n%red(%rootException)\", \"includeCallerData\": true } Next, lets turn on all the basic filters and see how they change what gets logged. src/main/java/com/example/helloworld/HelloWorldApplication.java java @Override public void run(HelloWorldConfiguration configuration, Environment environment) { // ... environment.getApplicationContext().addFilter( StructuredArgumentLoggingFilter.class, \"/*\", EnumSet.of(DispatcherType.REQUEST)); environment.getApplicationContext().addFilter( new FilterHolder(new DurationStructuredLoggingFilter(configuration.getClockFactory().createClock())), \"/*\", EnumSet.of(DispatcherType.REQUEST)); environment.jersey().register(CorrelationIdFilter.class); environment.jersey().register(ResourceInfoLoggingFilter.class); environment.jersey().register(StatusInfoStructuredLoggingFilter.class); // ... register other stuff, including jersey resources } With the logFormat and the filters in place, we can rerun IntegrationTest and see the new logs in action. INFO 15:03:56 [dw-22] {liftwizard.time.startTime=2020-05-06T19:03:56.967412Z, liftwizard.response.http.statusEnum=OK, liftwizard.response.http.statusCode=200, liftwizard.response.http.statusFamily=SUCCESSFUL, liftwizard.response.http.statusPhrase=OK, liftwizard.response.http.entityType=com.example.helloworld.api.Saying, liftwizard.time.endTime=2020-05-06T19:03:56.984585Z, liftwizard.time.duration.pretty=0.017173s, liftwizard.time.duration.ms=17, liftwizard.time.duration.ns=17173000} {liftwizard.request.resourceMethodName=sayHello, liftwizard.request.parameter.query.name=Dr. IntegrationTest, liftwizard.request.resourceClassName=com.example.helloworld.resources.HelloWorldResource, liftwizard.request.httpPath=hello-world, liftwizard.request.correlationId=82681aab-1a69-4fc0-b425-a5cbcbf98411, liftwizard.request.httpMethod=GET, liftwizard.request.httpPathTemplate=/hello-world} com.liftwizard.servlet.logging.structured.argument.StructuredArgumentLoggingFilter: structured logging This can be hard to see in a single line but it includes:liftwizard.request.correlationId=82681aab-1a69-4fc0-b425-a5cbcbf98411liftwizard.request.httpMethod=GETliftwizard.request.httpPath=hello-worldliftwizard.request.httpPathTemplate=/hello-worldliftwizard.request.parameter.query.name=Dr. IntegrationTestliftwizard.request.resourceClassName=com.example.helloworld.resources.HelloWorldResourceliftwizard.request.resourceMethodName=sayHelloliftwizard.response.http.entityType=com.example.helloworld.api.Sayingliftwizard.response.http.statusCode=200liftwizard.response.http.statusEnum=OKliftwizard.response.http.statusFamily=SUCCESSFULliftwizard.response.http.statusPhrase=OKliftwizard.time.duration.ms=17liftwizard.time.duration.ns=17173000liftwizard.time.duration.pretty=0.017173sliftwizard.time.endTime=2020-05-06T19:03:56.984585Zliftwizard.time.startTime=2020-05-06T19:03:56.967412ZLet's take a look at each filter individually.The StructuredArgumentLoggingFilter is a pre-requisite for structured logging. For the most part, you can pick and choose which dependencies you want to include, but liftwizard-servlet-logging-structured-argument is usually required. StructuredArgumentLoggingFilter is a servlet filter that puts a \"structured-logging\" LinkedHashMap into the ServletRequest at the beginning of each request. Next, all other structured logging filters put their context into the same map. Finally, StructuredArgumentLoggingFilter logs the text \"structured logging\" together with all context at the end of each servlet request.The CorrelationIdFilter gets the correlation id from a request header, adds it to the ContainerResponseContext , and adds it to MDC. If there is no correlation id, CorrelationIdFilter creates one first. The default header name and MDC key are both \"liftwizard.request.correlationId\" .The ResourceInfoLoggingFilter gets information from the jax-rs UriInfo and adds it to MDC.This includes:liftwizard.request.httpPathliftwizard.request.httpMethodliftwizard.request.resourceClassNameliftwizard.request.resourceMethodNameliftwizard.request.httpPathTemplateIn addition, for every query and path parameter, it adds a key of the form:liftwizard.request.parameter.query.liftwizard.request.parameter.path.The StatusInfoStructuredLoggingFilter gets information from the jax-rs StatusType and adds it to the structured argument map.This includes:liftwizard.response.http.statusEnumliftwizard.response.http.statusCodeliftwizard.response.http.statusFamilyliftwizard.response.http.statusPhraseliftwizard.response.http.entityType DurationStructuredLoggingFilter is a servlet filter that adds request/response timing information to the structured argument map.This includes:liftwizard.time.endTimeliftwizard.time.duration.prettyliftwizard.time.duration.msliftwizard.time.duration.nsSince the CorrelationIdFilter may need to generate ids if none are passed in, it needs a factory of UUIDs.Since the DurationStructuredLoggingFilter generates timing information, it needs a clock. java @Override public void initialize(Bootstrap<HelloWorldConfiguration> bootstrap) { bootstrap.setConfigurationFactoryFactory(new JsonConfigurationFactoryFactory<>()); bootstrap.addBundle(new EnvironmentConfigBundle()); bootstrap.addBundle(new ClockBundle()); bootstrap.addBundle(new UUIDBundle()); // ... }); } For more information on configuring sources of randomness, see the documentation for liftwizard-clock and liftwizard-uuid. liftwizard-config-logging-logstash-file is a Dropwizard AppenderFactory . It sets up a file appender that logs one json object per log statement. The json is formatted by https://github.com/logstash/logstash-logback-encoder logstash-logback-encoder and is ready to be parsed by logstash.Let's add the logstash-file appender to the list of configured appenders. src/test/resources/test-example.json5 json5 logging: { level: \"INFO\", appenders: [ { \"type\" : \"console\", \"timeZone\" : \"system\", \"logFormat\" : \"%highlight(%-5level) %cyan(%date{HH:mm:ss}) [%white(%thread)] %blue(%marker) {%magenta(%mdc)} %green(%logger): %message%n%red(%rootException)\", \"includeCallerData\": true }, { \"type\" : \"logstash-file\", \"currentLogFilename\" : \"./logs/logstash.json\", \"archivedLogFilenamePattern\": \"./logs/logstash-%d.json\", \"includeCallerData\" : true } ] } logs/logstash.json snippet json { \"@timestamp\": \"2020-05-06T15:03:56.984-04:00\", \"@version\": \"1\", \"message\": \"structured logging\", \"logger_name\": \"com.liftwizard.servlet.logging.structured.argument.StructuredArgumentLoggingFilter\", \"thread_name\": \"dw-22\", \"level\": \"INFO\", \"level_value\": 20000, \"liftwizard.request.resourceMethodName\": \"sayHello\", \"liftwizard.request.parameter.query.name\": \"Dr. IntegrationTest\", \"liftwizard.request.resourceClassName\": \"com.example.helloworld.resources.HelloWorldResource\", \"liftwizard.request.httpPath\": \"hello-world\", \"liftwizard.request.correlationId\": \"82681aab-1a69-4fc0-b425-a5cbcbf98411\", \"liftwizard.request.httpMethod\": \"GET\", \"liftwizard.request.httpPathTemplate\": \"/hello-world\", \"liftwizard.time.startTime\": \"2020-05-06T19:03:56.967412Z\", \"liftwizard.response.http.statusEnum\": \"OK\", \"liftwizard.response.http.statusCode\": 200, \"liftwizard.response.http.statusFamily\": \"SUCCESSFUL\", \"liftwizard.response.http.statusPhrase\": \"OK\", \"liftwizard.response.http.entityType\": \"com.example.helloworld.api.Saying\", \"liftwizard.time.endTime\": \"2020-05-06T19:03:56.984585Z\", \"liftwizard.time.duration.pretty\": \"0.017173s\", \"liftwizard.time.duration.ms\": 17, \"liftwizard.time.duration.ns\": 17173000, \"caller_class_name\": \"com.liftwizard.servlet.logging.structured.argument.StructuredArgumentLoggingFilter\", \"caller_method_name\": \"log\", \"caller_file_name\": \"StructuredArgumentLoggingFilter.java\", \"caller_line_number\": 86 }"],["logging@@JerseyHttpLoggingBundle@@jerseyhttploggingbundle","Logging","JerseyHttpLoggingBundle","JerseyHttpLoggingBundle","The JerseyHttpLoggingBundle logs all requests and responses to slf4j. The verbosity and maxEntitySize are configurable.To turn it on, add JerseyHttpLoggingBundle to the list of registered bundles. java @Override public void initialize(Bootstrap<HelloWorldConfiguration> bootstrap) { bootstrap.setConfigurationFactoryFactory(new JsonConfigurationFactoryFactory<>()); bootstrap.addBundle(new EnvironmentConfigBundle()); bootstrap.addBundle(new ObjectMapperBundle()); bootstrap.addBundle(new ConfigLoggingBundle()); bootstrap.addBundle(new JerseyHttpLoggingBundle()); // ... } If ObjectMapperBundle is also registered, the json bodies will be pretty-printed. INFO 21:01:18 [dw-26 - POST /people] {} com.liftwizard.dropwizard.bundle.httplogging.JerseyHttpLoggingBundle: 1 * Server has received a request on thread dw-26 - POST /people 1 > POST http://localhost:59980/people 1 > Accept: text/html, image/gif, image/jpeg, *; q=.2, */*; q=.2 1 > Connection: keep-alive 1 > Content-Length: 83 1 > Content-Type: application/json 1 > Host: localhost:59980 1 > User-Agent: Jersey/2.25.1 (HttpUrlConnection 11.0.7) { \"id\" : 0, \"fullName\" : \"Dr. IntegrationTest\", \"jobTitle\" : \"Chief Wizard\" } INFO 21:01:18 [dw-26 - POST /people] {liftwizard.request.resourceMethodName=createPerson, liftwizard.request.resourceClassName=com.example.helloworld.resources.PeopleResource, liftwizard.request.httpPath=people, liftwizard.request.correlationId=4bb909d0-4c29-3f81-957f-aab6d7f73c9f, liftwizard.request.httpMethod=POST, liftwizard.request.httpPathTemplate=/people} com.liftwizard.dropwizard.bundle.httplogging.JerseyHttpLoggingBundle: 1 * Server responded with a response on thread dw-26 - POST /people 1 < 200 1 < Content-Type: application/json 1 < liftwizard.request.correlationId: 4bb909d0-4c29-3f81-957f-aab6d7f73c9f { \"id\" : 1, \"fullName\" : \"Dr. IntegrationTest\", \"jobTitle\" : \"Chief Wizard\" }"]]
/*
 * Copyright 2019 TWO SIGMA OPEN SOURCE, LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

znaiSearchIdx = lunr(function () {
    this.ref('id')
    this.field('section')
    this.field('pageTitle')
    this.field('pageSection')
    this.field('text')

    this.metadataWhitelist = ['position']

    znaiSearchData.forEach(function (e) {
        this.add({
            id: e[0],
            section: e[1],
            pageTitle: e[2],
            pageSection: e[3],
            text: e[4],
        })
    }, this)
})
