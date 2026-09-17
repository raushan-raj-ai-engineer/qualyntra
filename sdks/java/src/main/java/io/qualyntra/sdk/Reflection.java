/**
 * File: sdks/java/src/main/java/io/qualyntra/sdk/Reflection.java
 * Purpose: Provides narrowly-scoped reflection helpers so optional Playwright/Selenium Java libraries can be invoked without becoming compile-time SDK dependencies.
 * Author: Raushan Raj
 */
package io.qualyntra.sdk;

import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.Arrays;

final class Reflection {
    private Reflection() {}

    static boolean available(String className) {
        try { Class.forName(className, false, ClassLoader.getSystemClassLoader()); return true; }
        catch (Throwable ignored) { return false; }
    }

    static Class<?> type(String name) throws ClassNotFoundException { return Class.forName(name); }

    static Object construct(String className, Object... args) throws Exception {
        return construct(type(className), args);
    }

    static Object construct(Class<?> type, Object... args) throws Exception {
        for (Constructor<?> constructor : type.getConstructors()) {
            if (matches(constructor.getParameterTypes(), args)) return constructor.newInstance(args);
        }
        throw new NoSuchMethodException("No matching constructor on " + type.getName());
    }

    static Object call(Object target, String name, Object... args) throws Exception {
        if (target == null) throw new IllegalArgumentException("reflection target is required for " + name);
        return invoke(target.getClass(), target, name, false, args);
    }

    static Object callStatic(String className, String name, Object... args) throws Exception {
        return invoke(type(className), null, name, true, args);
    }

    static Object fieldStatic(String className, String fieldName) throws Exception {
        Field field = type(className).getField(fieldName);
        return field.get(null);
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    static Object enumValue(String className, String value) throws Exception {
        Class<?> raw = type(className);
        return Enum.valueOf((Class<? extends Enum>) raw.asSubclass(Enum.class), value);
    }

    private static Object invoke(Class<?> type, Object target, String name, boolean staticOnly, Object... args) throws Exception {
        Method best = null;
        for (Method method : type.getMethods()) {
            if (!method.getName().equals(name)) continue;
            if (staticOnly != Modifier.isStatic(method.getModifiers())) continue;
            if (!matches(method.getParameterTypes(), args)) continue;
            if (best == null || specificity(method.getParameterTypes()) > specificity(best.getParameterTypes())) best = method;
        }
        if (best == null) throw new NoSuchMethodException(type.getName() + "." + name + Arrays.toString(args));
        return best.invoke(target, args);
    }

    private static int specificity(Class<?>[] types) {
        int score = 0;
        for (Class<?> type : types) if (!Object.class.equals(type)) score++;
        return score;
    }

    private static boolean matches(Class<?>[] types, Object[] args) {
        if (types.length != args.length) return false;
        for (int i = 0; i < types.length; i++) {
            if (args[i] == null) { if (types[i].isPrimitive()) return false; continue; }
            if (!box(types[i]).isAssignableFrom(args[i].getClass())) return false;
        }
        return true;
    }

    private static Class<?> box(Class<?> type) {
        if (!type.isPrimitive()) return type;
        if (type == boolean.class) return Boolean.class;
        if (type == byte.class) return Byte.class;
        if (type == short.class) return Short.class;
        if (type == int.class) return Integer.class;
        if (type == long.class) return Long.class;
        if (type == float.class) return Float.class;
        if (type == double.class) return Double.class;
        if (type == char.class) return Character.class;
        return type;
    }
}
