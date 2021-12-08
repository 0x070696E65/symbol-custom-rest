
from lark import Lark, Transformer
from lark.indenter import Indenter

from .ast import (Alias, Array, ArraySeed, Comment, Conditional, Enum, EnumValue, FixedSizeBuffer, FixedSizeInteger, Struct, StructField,
                  StructInlinePlaceholder)


def create_cats_lark_parser():
    """Creates a CATS grammar-based Lark parser that can be used for parsing CATS files."""

    class CatbufferIndenter(Indenter):
        NL_type = '_NL'
        OPEN_PAREN_types = []
        CLOSE_PAREN_types = []
        INDENT_type = '_INDENT'
        DEDENT_type = '_DEDENT'
        tab_len = 4

    class CatbufferTransformer(Transformer):
        # pylint: disable=too-many-public-methods

        # region PODs

        @staticmethod
        def ESCAPED_STRING(string):  # pylint: disable=invalid-name
            return string[1:-1]  # trim quotes

        @staticmethod
        def DEC_NUMBER(string):  # pylint: disable=invalid-name
            return int(string, 10)

        @staticmethod
        def HEX_NUMBER(string):  # pylint: disable=invalid-name
            return int(string, 16)

        @staticmethod
        def FIXED_SIZE_INTEGER(string):  # pylint: disable=invalid-name
            return FixedSizeInteger(string)

        @staticmethod
        def fixed_size_buffer(tokens):  # pylint: disable=invalid-name
            return FixedSizeBuffer(tokens[0])

        # endregion

        # region comment

        @staticmethod
        def comment(tokens):
            return Comment(tokens[0])

        @staticmethod
        def statement(tokens):
            tokens[1].comment = tokens[0]
            return tokens[1]

        # endregion

        # region alias

        @staticmethod
        def alias(tokens):
            return Alias(tokens)

        # endregion

        # region enum

        @staticmethod
        def enum(tokens):
            return Enum(tokens)

        @staticmethod
        def enum_child(tokens):
            return CatbufferTransformer.statement(tokens)

        @staticmethod
        def enum_value(tokens):
            return EnumValue(tokens)

        # endregion

        # region struct

        @staticmethod
        def struct(tokens):
            return Struct(tokens)

        @staticmethod
        def struct_child(tokens):
            return CatbufferTransformer.statement(tokens)

        @staticmethod
        def struct_inline(tokens):
            return StructInlinePlaceholder(tokens)

        @staticmethod
        def struct_field(tokens):
            return StructField(tokens)

        @staticmethod
        def struct_field_const(tokens):
            return StructField(tokens, 'const')

        @staticmethod
        def struct_field_reserved(tokens):
            return StructField(tokens, 'reserved')

        @staticmethod
        def struct_field_inline(tokens):
            return StructField(tokens, 'inline')

        @staticmethod
        def conditional_expression(tokens):
            return Conditional(tokens)

        # endregion

        # region array

        @staticmethod
        def count_based_array(tokens):
            return ArraySeed(tokens, 'array')

        @staticmethod
        def size_based_array(tokens):
            return ArraySeed(tokens, 'array sized')

        @staticmethod
        def fill_based_array(tokens):
            return ArraySeed(tokens, 'array fill')

        @staticmethod
        def array_expression(tokens):
            return Array(tokens)

        # endregion

    return Lark.open(
        'grammar/catbuffer.lark',
        rel_to=__file__,
        parser='lalr',
        postlex=CatbufferIndenter(),
        transformer=CatbufferTransformer())
