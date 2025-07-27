# 反调试破除者--AntiDebug_Breaker

## Intro

本插件是基于Hook_JS库所写的google插件，将致力于绕过前端各种反调试操作。

## 使用场景

- Bypass Debugger

该脚本用于绕过**无限Debugger**，目前引起无限Debugger的三种核心方式为：

> eval

> Function

> Function.prototype.constructor

本脚本通过hook以上三种核心方式绕过debugger，但由于eval的作用域问题，脚本在某些网站运行时难免会出现报错，这也就导致我们可能无法正常地在这些报错的网站上调试，此时我们就可以选择去火狐浏览器。