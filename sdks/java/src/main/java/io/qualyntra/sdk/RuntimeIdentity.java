/**
 * File: sdks/java/src/main/java/io/qualyntra/sdk/RuntimeIdentity.java
 * Purpose: Defines the Java runtime identity record shared by JUnit/TestNG/Selenium/Playwright integrations.
 * Author: Raushan Raj
 */
package io.qualyntra.sdk;
public record RuntimeIdentity(String language,String runner,String engine,String runnerVersion,String engineVersion) { public RuntimeIdentity { if(language==null||language.isBlank()) throw new IllegalArgumentException("language is required"); if(runner==null||runner.isBlank()) throw new IllegalArgumentException("runner is required"); } }

