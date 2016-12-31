
'use strict';

var autocompl = require("autocompl");
var pluralize = require("pluralize");

exports.handler = function (event, context) {
    try {
        var requestId = event.request.requestId;
        var sessionId = event.session.sessionId;

        if (event.session.new) {
            console.log("Session started: requestId = " + requestId + ", sessionId = " + sessionId);
        }
        
        if (event.request.type === "LaunchRequest") {
            console.log("LaunchRequest: requestId = " + requestId + ", sessionId = " + sessionId);
            context.succeed({response: {
                outputSpeech: { type: "PlainText", text: "What would you like to know about?" },
                shouldEndSession: false
            }});
        }
        else if (event.request.type === "IntentRequest") {
            console.log("IntentRequest: requestId = " + requestId + ", sessionId = " + sessionId);
            onIntentRequest(
                event.request,
                function callback(responseText) {
                    context.succeed({response: {
                        outputSpeech: { type: "PlainText", text: responseText },
                        shouldEndSession: true
                    }});
                });
        }
        else if (event.request.type === "SessionEndedRequest") {
            console.log("Session ended: requestId = " + requestId + ", sessionId = " + sessionId);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

function onIntentRequest(intentRequest, callback) {
    var intent = intentRequest.intent;
    if ("GetAutocompleteIntent" === intent.name) {
        var target = intent.slots.Target;
        if (target && target.value) {
            getAutocompleteResponse(target.value, callback);
        }
        else {
            callback("I'm sorry. I didn't recognize the requested search. Try asking what everyone thinks about something.");
        }
    }
    else if ("AMAZON.HelpIntent" === intent.name) {
        callback("Ask me what everyone thinks about something and I will look for an answer using Google autocomplete.");
    }
    else {
        throw "Invalid intent" + intent.name;
    }
}

// Verbs used for building autocomplete query string. Add spaces around the verb so it's treated as a separate word when doing autocomplete search.
var pluralVerb = " are ";
var singularVerb = " is ";

// Object pronouns get special rules when building the autocomplete query string. Add space after the verb so it's treated as a separate word when doing autocomplete.
var objectPronounToQuery =
{
    "i" : "i am ",
    "me" : "i am ",
    "you" : "you are ",
    "him" : "he is ",
    "her" : "she is ",
    "us" : "we are ",
    "them" : "they are "
};

function getAutocompleteResponse(target, callback) {
    var queryString = objectPronounToQuery[target.toLowerCase()];
    if (queryString) {
        getAutocompleteSuggestions(target, queryString, function(success, autocompleteResponse) {
            callback(autocompleteResponse);
        });
    }
    else{
        var usePlural = true;
        if (target == pluralize.singular(target)) {
            usePlural = false;
        }
        var verb = usePlural ? pluralVerb : singularVerb;
        queryString = target + verb;

        getAutocompleteSuggestions(target, queryString, function(success, autocompleteResponse) {
            if (success) {
                callback(autocompleteResponse);
            }
            else {
                // As backup, try reversing the plurality of the verb and doing another autocomplete search on that.
                verb = usePlural ? singularVerb : pluralVerb;
                queryString = target + verb;
                getAutocompleteSuggestions(target, queryString, function(success, autocompleteResponse) {
                    callback(autocompleteResponse); // If the second operation still not successful, the response will contain an error message.
                });
            }
        });
    }
}

function getAutocompleteSuggestions(target, queryString, callback) {
    autocompl(queryString, function done(error, suggestions) {
        if (error) {
            callback(false, "There was an error processing request for " + target + ". Try asking something else.");
            return;
        }
        else {
            if (suggestions != null && suggestions.length > 0) {
                for (let suggestion of suggestions) {
                    if (suggestion.startsWith(queryString)) {
                        callback(true, suggestion);
                        return;
                    }
                }
            }

            callback(false, "I couldn't find any results for " + target + ". Try asking something else.");
            return;
        }
    });
}