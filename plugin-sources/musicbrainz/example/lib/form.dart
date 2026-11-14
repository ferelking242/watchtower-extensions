import 'package:flutter/material.dart';

class FormPage extends StatefulWidget {
  final String title;
  final List<Map<String, dynamic>> fields;
  const FormPage({super.key, required this.title, required this.fields});

  @override
  State<FormPage> createState() => _FormPageState();
}

class _FormPageState extends State<FormPage> {
  final _formKey = GlobalKey<FormState>();
  final Map<String, dynamic> _formData = {};

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.title)),
      body: Form(
        key: _formKey,
        child: Center(
          child: Container(
            padding: const EdgeInsets.all(16.0),
            constraints: const BoxConstraints(
              maxWidth: 600,
            ),
            child: CustomScrollView(
              slivers: [
                SliverList.separated(
                  separatorBuilder:
                      (context, index) => const SizedBox(height: 16),
                  itemCount: widget.fields.length,
                  itemBuilder: (context, index) {
                    final field = widget.fields[index];
          
                    if (field['objectType'] == 'text') {
                      return Text(field["text"]);
                    }
          
                    if (field["objectType"] == "input") {
                      return TextFormField(
                        decoration: InputDecoration(
                          labelText: field['placeholder'] ?? '',
                        ),
                        obscureText: field['variant'] == 'password',
                        keyboardType:
                            field['variant'] == 'number'
                                ? TextInputType.number
                                : TextInputType.text,
                        initialValue: field['defaultValue'],
                        validator: (value) {
                          if (field['required'] &&
                              (value == null || value.isEmpty)) {
                            return 'This field is required';
                          }
                          if (field['regex'] != null &&
                              !RegExp(field['regex']).hasMatch(value ?? '')) {
                            return 'Invalid format';
                          }
                          return null;
                        },
                        onChanged: (value) {
                          _formData[field['id']] = value;
                        },
                      );
                    }
          
                    return SizedBox.shrink(); // For unsupported field types
                  },
                ),
                const SliverToBoxAdapter(
                  child: SizedBox(height: 16), // Spacer
                ),
                SliverToBoxAdapter(
                  child: ElevatedButton(
                    onPressed: () {
                      if (_formKey.currentState?.validate() ?? false) {
                        final data =
                            _formData.entries
                                .map(
                                  (e) => <String, dynamic>{
                                    "id": e.key,
                                    "value": e.value,
                                  },
                                )
                                .toList();
                        Navigator.pop(context, data);
                      }
                    },
                    child: const Text('Submit'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
